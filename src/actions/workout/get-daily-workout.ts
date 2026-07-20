"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchProblemsByTag, fetchRandomLeetCodeProblems } from "@/lib/leetcode";
import { DatabaseProblem, WorkoutProblem } from "./types";
import { getLocalDateStr, patternToSlug, toWorkoutProblem, getOrInsertProblem } from "./utils";
import { cookies } from "next/headers";

/**
 * Fetches or generates today's "Daily 3" workout problems for the authenticated user.
 *
 * Pipeline:
 *   Step 1 — Resolve today's date + fetch already-solved-today problems
 *   Step 2 — Pick 1 REVISION problem (due today or nearest future)
 *   Step 3 — Restore any other already-solved-today problems into the workout
 *   Step 4 — Fill remaining slots with DISCOVERY/NEW from local DB
 *   Step 5 — LeetCode fallback (only if local DB can't fill 3 slots)
 */
export async function getDailyWorkout(clientTodayStr?: string): Promise<WorkoutProblem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // ─── Step 1: Resolve today's date + fetch what's already solved today ───
  const cookieStore = await cookies();
  const tz = cookieStore.get("timezone")?.value || "UTC";
  const todayStr = clientTodayStr ?? getLocalDateStr(new Date(), tz);

  const { data: todayActivity } = await supabase
    .from("activity_log")
    .select("problem_id, quality")
    .eq("user_id", user.id)
    .eq("solved_at", todayStr);

  const solvedToday = new Map<string, number>(
    todayActivity?.map((a) => [a.problem_id, a.quality]) || []
  );

  const workoutProblems: WorkoutProblem[] = [];
  const selectedIds = new Set<string>();

  // ─── Step 2: Pick 1 REVISION problem ───
  // A revision problem is one that is due for review (next_review_date ≤ today),
  // excluding mastered, Easy, and Database-pattern problems.

  let revisionProblem: DatabaseProblem | null = null;

  // 2a. Check if any problem solved today is actually a due revision
  //     (it has user_progress with next_review_date ≤ today and is not mastered)
  if (solvedToday.size > 0) {
    const solvedTodayIds = Array.from(solvedToday.keys());

    const { data: solvedRevisionCandidates } = await supabase
      .from("user_progress")
      .select("*, problems!inner(*)")
      .eq("user_id", user.id)
      .in("problem_id", solvedTodayIds)
      .neq("status", "mastered")
      .neq("next_review_date", "9999-12-31")
      .neq("problems.difficulty", "Easy")
      .not("problems.patterns", "cs", '{"Database"}')
      .lte("next_review_date", todayStr)
      .order("next_review_date", { ascending: true })
      .limit(1);

    if (solvedRevisionCandidates && solvedRevisionCandidates.length > 0) {
      revisionProblem = solvedRevisionCandidates[0].problems as unknown as DatabaseProblem;
    }
  }

  // 2b. If no solved-today revision found, pick the earliest due from user_progress
  if (!revisionProblem) {
    const { data: dueRevision } = await supabase
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

    if (dueRevision && dueRevision.problems) {
      revisionProblem = dueRevision.problems as unknown as DatabaseProblem;

      // If scheduled in the future, pull it forward to today
      if (dueRevision.next_review_date > todayStr) {
        await supabase
          .from("user_progress")
          .update({ next_review_date: todayStr })
          .eq("id", dueRevision.id);
      }
    }
  }

  // Add revision to the workout
  if (revisionProblem) {
    workoutProblems.push(toWorkoutProblem(revisionProblem, "REVISION", solvedToday));
    selectedIds.add(revisionProblem.id);
  }

  // ─── Step 3: Restore any other already-solved-today problems ───
  // These must stay in the workout so the UI doesn't flicker on refresh.
  if (solvedToday.size > 0) {
    const otherSolvedIds = Array.from(solvedToday.keys()).filter((id) => !selectedIds.has(id));

    if (otherSolvedIds.length > 0) {
      const { data: otherProblems } = await supabase
        .from("problems")
        .select("*")
        .in("id", otherSolvedIds);

      if (otherProblems) {
        const revisionPatterns = revisionProblem?.patterns || [];
        for (const p of otherProblems) {
          if (workoutProblems.length >= 3) break;
          const prob = p as unknown as DatabaseProblem;
          const sharesPattern = revisionPatterns.length > 0 &&
            revisionPatterns.some((pat: string) => prob.patterns?.includes(pat));
          workoutProblems.push(
            toWorkoutProblem(prob, sharesPattern ? "DISCOVERY" : "NEW", solvedToday)
          );
          selectedIds.add(prob.id);
        }
      }
    }
  }

  // ─── Step 4: Fill remaining slots from local DB ───
  const revisionPatterns = revisionProblem?.patterns || [];

  if (workoutProblems.length < 3) {
    const needCount = 3 - workoutProblems.length;

    // Fetch a small batch of eligible problems.
    // We fetch more than needed so we can filter out already-progressed ones client-side.
    let query = supabase
      .from("problems")
      .select("*")
      .neq("difficulty", "Easy")
      .not("patterns", "cs", '{"Database"}');

    // Exclude the problems already selected for today's workout
    if (selectedIds.size > 0) {
      const excludeArr = Array.from(selectedIds);
      query = query.not("id", "in", `(${excludeArr.join(",")})`);
    }

    // If we have a revision pattern, prefer problems that share patterns (DISCOVERY)
    if (revisionPatterns.length > 0) {
      query = query.overlaps("patterns", revisionPatterns);
    }

    // Fetch a batch (more than needed to allow filtering out progressed ones)
    const batchSize = Math.max(needCount * 5, 15);
    const { data: candidateProblems } = await query.limit(batchSize);

    if (candidateProblems && candidateProblems.length > 0) {
      // Check which of these the user has already progressed on
      const candidateIds = candidateProblems.map((p) => p.id);
      const { data: progressedRows } = await supabase
        .from("user_progress")
        .select("problem_id")
        .eq("user_id", user.id)
        .in("problem_id", candidateIds);

      const progressedSet = new Set(progressedRows?.map((r) => r.problem_id) || []);

      // Pick unsolved problems first, then fall back to progressed ones
      const unsolved = candidateProblems.filter((p) => !progressedSet.has(p.id));
      const pool = unsolved.length >= needCount ? unsolved : [...unsolved, ...candidateProblems.filter((p) => progressedSet.has(p.id))];

      for (const p of pool) {
        if (workoutProblems.length >= 3) break;
        if (selectedIds.has(p.id)) continue;

        const tag = revisionPatterns.length > 0 ? "DISCOVERY" : "NEW";
        workoutProblems.push(toWorkoutProblem(p as unknown as DatabaseProblem, tag, solvedToday));
        selectedIds.add(p.id);
      }
    }

    // If pattern-filtered query didn't return enough, try without pattern filter
    if (workoutProblems.length < 3 && revisionPatterns.length > 0) {
      const fallbackNeed = 3 - workoutProblems.length;
      let fallbackQuery = supabase
        .from("problems")
        .select("*")
        .neq("difficulty", "Easy")
        .not("patterns", "cs", '{"Database"}');

      if (selectedIds.size > 0) {
        const excludeArr = Array.from(selectedIds);
        fallbackQuery = fallbackQuery.not("id", "in", `(${excludeArr.join(",")})`);
      }

      const { data: fallbackProblems } = await fallbackQuery.limit(fallbackNeed * 3);

      if (fallbackProblems) {
        // Check progress for these too
        const fbIds = fallbackProblems.map((p) => p.id);
        const { data: fbProgressRows } = await supabase
          .from("user_progress")
          .select("problem_id")
          .eq("user_id", user.id)
          .in("problem_id", fbIds);

        const fbProgressedSet = new Set(fbProgressRows?.map((r) => r.problem_id) || []);
        const fbUnsolved = fallbackProblems.filter((p) => !fbProgressedSet.has(p.id));
        const fbPool = fbUnsolved.length >= (3 - workoutProblems.length)
          ? fbUnsolved
          : [...fbUnsolved, ...fallbackProblems.filter((p) => fbProgressedSet.has(p.id))];

        for (const p of fbPool) {
          if (workoutProblems.length >= 3) break;
          if (selectedIds.has(p.id)) continue;
          workoutProblems.push(toWorkoutProblem(p as unknown as DatabaseProblem, "NEW", solvedToday));
          selectedIds.add(p.id);
        }
      }
    }
  }

  // ─── Step 5: LeetCode fallback (only if local DB can't fill 3 slots) ───
  if (workoutProblems.length < 3) {
    // Build a set of slugs to skip (already selected + user's progressed problems)
    const solvedSlugs = new Set<string>();
    for (const wp of workoutProblems) {
      solvedSlugs.add(wp.title_slug);
    }

    // Also fetch slugs of progressed problems to avoid re-fetching from LeetCode
    const { data: progressedProbs } = await supabase
      .from("user_progress")
      .select("problems!inner(title_slug)")
      .eq("user_id", user.id);

    if (progressedProbs) {
      for (const row of progressedProbs) {
        const prob = row.problems as unknown as { title_slug: string };
        if (prob?.title_slug) solvedSlugs.add(prob.title_slug);
      }
    }

    // 5a. Try LeetCode by revision pattern tags
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

    // 5b. Random LeetCode fallback
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
