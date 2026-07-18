"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchProblemsByTag, fetchRandomLeetCodeProblems } from "@/lib/leetcode";
import { DatabaseProblem, WorkoutProblem } from "./types";
import { getLocalDateStr, patternToSlug, toWorkoutProblem, getOrInsertProblem } from "./utils";
import { cookies } from "next/headers";

/**
 * Fetches or generates today's "Daily 3" workout problems for the authenticated user.
 */
export async function getDailyWorkout(clientTodayStr?: string): Promise<WorkoutProblem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // 1. Resolve date based on timezone cookie
  const cookieStore = await cookies();
  const tz = cookieStore.get("timezone")?.value || "UTC";
  const todayStr = clientTodayStr ?? getLocalDateStr(new Date(), tz);

  // 2. Fetch today's activity (already solved problems)
  const { data: todayActivity } = await supabase
    .from("activity_log")
    .select("problem_id, quality")
    .eq("user_id", user.id)
    .eq("solved_at", todayStr);

  const solvedToday = new Map<string, number>(
    todayActivity?.map((a) => [a.problem_id, a.quality]) || []
  );
  const solvedTodayIds = Array.from(solvedToday.keys());

  const workoutProblems: WorkoutProblem[] = [];
  const selectedIds = new Set<string>();

  // 3. Determine if a revision problem was already solved today.
  // A revision problem is a problem solved today that had at least one activity log entry before today.
  let revisionEntry: any = null;

  if (solvedTodayIds.length > 0) {
    const { data: pastAct } = await supabase
      .from("activity_log")
      .select("problem_id")
      .eq("user_id", user.id)
      .in("problem_id", solvedTodayIds)
      .lt("solved_at", todayStr)
      .limit(1);

    if (pastAct && pastAct.length > 0) {
      const { data: progress } = await supabase
        .from("user_progress")
        .select("*, problems!inner(*)")
        .eq("user_id", user.id)
        .eq("problem_id", pastAct[0].problem_id)
        .neq("problems.difficulty", "Easy")
        .not("problems.patterns", "cs", '{"Database"}')
        .maybeSingle();
      if (progress && progress.problems) {
        revisionEntry = progress;
      }
    }
  }

  // If no revision problem was solved today, get the earliest due revision problem
  if (!revisionEntry) {
    const { data: progress } = await supabase
      .from("user_progress")
      .select("*, problems!inner(*)")
      .eq("user_id", user.id)
      .neq("status", "mastered")
      .neq("next_review_date", "9999-12-31")
      .neq("problems.difficulty", "Easy")
      .not("problems.patterns", "cs", '{"Database"}')
      .order("next_review_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (progress && progress.problems) {
      revisionEntry = progress;
      // Rebalance future reviews to today if scheduled for the future
      if (revisionEntry.next_review_date > todayStr) {
        await supabase
          .from("user_progress")
          .update({ next_review_date: todayStr })
          .eq("id", revisionEntry.id);
        revisionEntry.next_review_date = todayStr;
      }
    }
  }

  // Add revision problem to workout list
  if (revisionEntry) {
    const revProb = revisionEntry.problems as unknown as DatabaseProblem;
    workoutProblems.push(toWorkoutProblem(revProb, "REVISION", solvedToday));
    selectedIds.add(revProb.id);
  }

  // 4. Add any other problems solved today to the workout list (so they don't disappear on refresh)
  const otherSolvedIds = solvedTodayIds.filter((id) => !selectedIds.has(id));
  if (otherSolvedIds.length > 0) {
    const { data: otherSolved } = await supabase
      .from("problems")
      .select("*")
      .in("id", otherSolvedIds);
    if (otherSolved) {
      for (const p of otherSolved) {
        // Tag as DISCOVERY if it shares tags with revision, else NEW
        const isDiscovery =
          revisionEntry?.problems?.patterns?.some((pat: string) =>
            p.patterns?.includes(pat)
          ) || false;
        workoutProblems.push(
          toWorkoutProblem(
            p as unknown as DatabaseProblem,
            isDiscovery ? "DISCOVERY" : "NEW",
            solvedToday
          )
        );
        selectedIds.add(p.id);
      }
    }
  }

  // Fetch all progressed problem IDs to exclude them from discovery/new pool
  const { data: userProgress } = await supabase
    .from("user_progress")
    .select("problem_id")
    .eq("user_id", user.id);
  const progressedIds = userProgress?.map((p) => p.problem_id) || [];

  const revisionPatterns = (revisionEntry?.problems as unknown as DatabaseProblem)?.patterns || [];

  // 5. Fill remaining slots with discovery/new problems from local DB
  if (workoutProblems.length < 3) {
    let query = supabase
      .from("problems")
      .select("*")
      .neq("difficulty", "Easy")
      .not("patterns", "cs", '{"Database"}');

    const excludeIds = progressedIds.filter((id) => !selectedIds.has(id));
    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    if (revisionPatterns.length > 0) {
      query = query.overlaps("patterns", revisionPatterns);
    }

    const needCount = 3 - workoutProblems.length;
    const { data: dbDiscovery } = await query.limit(needCount);

    if (dbDiscovery) {
      for (const p of dbDiscovery) {
        workoutProblems.push(
          toWorkoutProblem(
            p as unknown as DatabaseProblem,
            revisionPatterns.length > 0 ? "DISCOVERY" : "NEW",
            solvedToday
          )
        );
        selectedIds.add(p.id);
      }
    }
  }

  // 6. Dynamic fetch fallbacks if still less than 3
  if (workoutProblems.length < 3) {
    const solvedSlugs = new Set<string>();

    // Fetch progressed slugs for validation
    if (progressedIds.length > 0) {
      const { data: progressedProbs } = await supabase
        .from("problems")
        .select("title_slug")
        .in("id", progressedIds);
      progressedProbs?.forEach((p) => solvedSlugs.add(p.title_slug));
    }

    // Try LeetCode by tag slug
    for (const pattern of revisionPatterns) {
      if (workoutProblems.length >= 3) break;
      const tagSlug = patternToSlug(pattern);
      if (tagSlug === "database") continue;

      const fetched = await fetchProblemsByTag(tagSlug, 20);
      for (const q of fetched) {
        if (workoutProblems.length >= 3) break;
        if (q.difficulty === "Easy" || solvedSlugs.has(q.titleSlug)) continue;

        const dbProb = await getOrInsertProblem(supabase, q.titleSlug, async () => ({
          title: q.title,
          leetcode_num: parseInt(q.frontendQuestionId, 10) || 0,
          title_slug: q.titleSlug,
          difficulty: q.difficulty,
          patterns: q.topicTags?.map((t) => t.name) || [pattern],
        }));

        if (dbProb && !selectedIds.has(dbProb.id)) {
          workoutProblems.push(toWorkoutProblem(dbProb, "DISCOVERY", solvedToday));
          selectedIds.add(dbProb.id);
        }
      }
    }

    // 7. General random fallbacks if still less than 3
    let attempts = 0;
    while (workoutProblems.length < 3 && attempts < 3) {
      attempts++;
      const diff = Math.random() > 0.5 ? "MEDIUM" : "HARD";
      const fetched = await fetchRandomLeetCodeProblems(diff, 30);

      for (const q of fetched) {
        if (workoutProblems.length >= 3) break;
        if (solvedSlugs.has(q.titleSlug)) continue;

        const dbProb = await getOrInsertProblem(supabase, q.titleSlug, async () => ({
          title: q.title,
          leetcode_num: parseInt(q.frontendQuestionId, 10) || 0,
          title_slug: q.titleSlug,
          difficulty: q.difficulty === "Hard" ? "Hard" : "Medium",
          patterns: q.topicTags?.map((t) => t.name) || [],
        }));

        if (dbProb && !selectedIds.has(dbProb.id)) {
          workoutProblems.push(toWorkoutProblem(dbProb, "NEW", solvedToday));
          selectedIds.add(dbProb.id);
        }
      }
    }
  }

  return workoutProblems;
}
