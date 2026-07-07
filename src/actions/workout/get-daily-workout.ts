"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchProblemsByTag, fetchRandomLeetCodeProblems } from "@/lib/leetcode";
import { DatabaseProblem, DatabaseUserProgress, WorkoutProblem } from "./types";
import { getLocalDateStr, patternToSlug, toWorkoutProblem } from "./utils";

/**
 * Fetches or generates today's "Daily 3" workout problems for the authenticated user.
 */
export async function getDailyWorkout(): Promise<WorkoutProblem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const todayStr = getLocalDateStr(new Date());

  // 1. Get today's activity to check solved statuses and ratings
  const { data: todayActivity, error: activityError } = await supabase
    .from("activity_log")
    .select("problem_id, quality")
    .eq("user_id", user.id)
    .eq("solved_at", todayStr);

  if (activityError) {
    console.error("Error fetching today's activity:", activityError);
  }

  const solvedToday = new Map<string, number>(
    todayActivity?.map((a) => [a.problem_id, a.quality]) || []
  );

  // 2. Fetch all problems from the database
  const { data: allProblems, error: problemsError } = await supabase
    .from("problems")
    .select("*");

  if (problemsError || !allProblems || allProblems.length === 0) {
    console.error("Error fetching problems or table is empty:", problemsError);
    return [];
  }

  const typedProblems = (allProblems as unknown as DatabaseProblem[]).filter(
    (p) => !p.patterns?.includes("Database")
  );

  // 3. Fetch user's progress to distinguish solved vs unsolved problems
  const { data: userProgress, error: progressError } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id);

  if (progressError) {
    console.error("Error fetching user progress:", progressError);
  }

  const typedProgress = (userProgress || []) as unknown as DatabaseUserProgress[];

  // Auto-correct any legacy/incorrect progress records for Easy or Mastered problems
  const legacyProgress = typedProgress.filter((p) => {
    const prob = typedProblems.find((pr) => pr.id === p.problem_id);
    if (!prob) return false;
    const isEasy = prob.difficulty === "Easy";
    const isMastered = p.status === "mastered";
    const needsEasyFix = isEasy && (p.status !== "mastered" || p.next_review_date !== "9999-12-31");
    const needsMasteredFix = isMastered && p.next_review_date !== "9999-12-31";
    return needsEasyFix || needsMasteredFix;
  });

  if (legacyProgress.length > 0) {
    console.log(`Auto-correcting ${legacyProgress.length} legacy progress records...`);
    for (const p of legacyProgress) {
      await supabase
        .from("user_progress")
        .update({
          status: "mastered",
          next_review_date: "9999-12-31"
        })
        .eq("id", p.id);
      
      // Update local in-memory objects to avoid stale data during this request
      p.status = "mastered";
      p.next_review_date = "9999-12-31";
    }
  }

  const progressMap = new Map<string, DatabaseUserProgress>(
    typedProgress.map((p) => [p.problem_id, p])
  );

  // Exclude all Easy problems and mastered/sentinel review date problems from the revision pool
  const eligibleProgress = typedProgress.filter((p) => {
    const prob = typedProblems.find((pr) => pr.id === p.problem_id);
    if (!prob) return false;
    return prob.difficulty !== "Easy" && p.status !== "mastered" && p.next_review_date !== "9999-12-31";
  });

  let revisionEntry: DatabaseUserProgress | undefined = undefined;

  // First, check if a revision problem was already solved today.
  // A revision problem is a problem solved today that has at least one activity log entry before today.
  const solvedProblemIds = Array.from(solvedToday.keys());
  let solvedRevisionProblemId: string | null = null;

  if (solvedProblemIds.length > 0) {
    const { data: pastActivities, error: pastActError } = await supabase
      .from("activity_log")
      .select("problem_id")
      .eq("user_id", user.id)
      .in("problem_id", solvedProblemIds)
      .lt("solved_at", todayStr);

    if (!pastActError && pastActivities && pastActivities.length > 0) {
      solvedRevisionProblemId = pastActivities[0].problem_id;
      revisionEntry = typedProgress.find((p) => p.problem_id === solvedRevisionProblemId);
    }
  }

  // If no revision problem was solved today, find the earliest one due
  if (!revisionEntry) {
    revisionEntry = eligibleProgress
      .filter((p) => p.next_review_date <= todayStr)
      .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))[0];

    if (!revisionEntry && eligibleProgress.length > 0) {
      revisionEntry = [...eligibleProgress].sort((a, b) =>
        a.next_review_date.localeCompare(b.next_review_date)
      )[0];

      if (revisionEntry) {
        console.log(`Rebalancing future revision problem ${revisionEntry.problem_id} (scheduled for ${revisionEntry.next_review_date}) to today (${todayStr})`);
        await supabase
          .from("user_progress")
          .update({ next_review_date: todayStr })
          .eq("id", revisionEntry.id);
        
        // Update local object representation
        revisionEntry.next_review_date = todayStr;
      }
    }
  }

  const workoutProblems: WorkoutProblem[] = [];
  const selectedIds = new Set<string>();
  const selectedSlugs = new Set<string>();

  if (revisionEntry) {
    const revProb = typedProblems.find((p) => p.id === revisionEntry.problem_id);
    if (revProb) {
      workoutProblems.push(toWorkoutProblem(revProb, "REVISION", solvedToday));
      selectedIds.add(revProb.id);
      selectedSlugs.add(revProb.title_slug);
    }
  }

  // 5. Find Discovery Problems: Unsolved, and topic must match the revision pattern (excluding Easy problems)
  // We also include discovery problems solved today so they don't get replaced on refresh.
  const solvedDiscoveryOrNewIds = new Set<string>();
  solvedToday.forEach((_, probId) => {
    if (probId !== solvedRevisionProblemId) {
      solvedDiscoveryOrNewIds.add(probId);
    }
  });

  const unsolvedProblems = typedProblems.filter((p) => {
    const hasProgress = progressMap.has(p.id);
    const solvedTodayAsDiscovery = solvedDiscoveryOrNewIds.has(p.id);
    return (!hasProgress || solvedTodayAsDiscovery) && p.difficulty !== "Easy";
  });

  // Build sets/maps for status checks and database lookups
  const solvedSlugs = new Set<string>();
  progressMap.forEach((_, probId) => {
    const p = typedProblems.find((pr) => pr.id === probId);
    if (p?.title_slug) {
      solvedSlugs.add(p.title_slug);
    }
  });

  const dbSlugToProblem = new Map<string, DatabaseProblem>(
    typedProblems.map((p) => [p.title_slug, p])
  );

  if (workoutProblems.length > 0 && workoutProblems.length < 3) {
    const revisionPatterns = workoutProblems[0].topics;

    // Try from local database first
    const matchingUnsolved = unsolvedProblems.filter((p) =>
      p.patterns?.some((pat: string) => revisionPatterns.includes(pat))
    );

    matchingUnsolved.forEach((p) => {
      if (workoutProblems.length < 3 && !selectedIds.has(p.id)) {
        workoutProblems.push(toWorkoutProblem(p, "DISCOVERY", solvedToday));
        selectedIds.add(p.id);
        selectedSlugs.add(p.title_slug);
      }
    });

    // If still need more, query LeetCode dynamically for each matching pattern tag
    if (workoutProblems.length < 3) {
      for (const pattern of revisionPatterns) {
        if (workoutProblems.length >= 3) break;

        const tagSlug = patternToSlug(pattern);
        if (tagSlug === "database") {
          continue;
        }
        console.log(`Querying LeetCode dynamically for tag: ${tagSlug} to fill workout slots...`);
        const fetchedQuestions = await fetchProblemsByTag(tagSlug, 20);

        for (const q of fetchedQuestions) {
          if (workoutProblems.length >= 3) break;

          // Skip Database questions
          if (q.topicTags?.some((t: { name: string; slug: string }) => t.slug === "database" || t.name === "Database")) {
            continue;
          }

          // Skip Easy problems
          if (q.difficulty === "Easy") {
            continue;
          }

          // Check if user already solved it
          if (solvedSlugs.has(q.titleSlug)) continue;

          // Check if already in workout
          const dbProb = dbSlugToProblem.get(q.titleSlug);
          if (dbProb && selectedIds.has(dbProb.id)) continue;

          if (dbProb) {
            // Unsolved problem already exists in database, use it
            workoutProblems.push(toWorkoutProblem(dbProb, "DISCOVERY", solvedToday));
            selectedIds.add(dbProb.id);
            selectedSlugs.add(dbProb.title_slug);
          } else {
            // Problem does not exist in DB, fetch details and insert it
            console.log(`Inserting dynamically fetched discovery problem: ${q.title}`);
            const { data: newProb, error: insertError } = await supabase
              .from("problems")
              .insert({
                title: q.title,
                leetcode_num: parseInt(q.frontendQuestionId, 10) || 0,
                title_slug: q.titleSlug,
                difficulty: q.difficulty,
                patterns: q.topicTags?.map((t: { name: string; slug: string }) => t.name) || [pattern],
                url: `https://leetcode.com/problems/${q.titleSlug}`,
              })
              .select("*")
              .single();

            if (insertError) {
              console.error("Failed to insert dynamically fetched discovery problem:", insertError);
              continue;
            }

            const typedNewProb = newProb as unknown as DatabaseProblem;
            workoutProblems.push(toWorkoutProblem(typedNewProb, "DISCOVERY", solvedToday));
            selectedIds.add(typedNewProb.id);
            selectedSlugs.add(typedNewProb.title_slug);
            dbSlugToProblem.set(q.titleSlug, typedNewProb);
          }
        }
      }
    }
  }

  // 6. Fill remaining slots with unsolved problems (same-topic restricted if revision is present)
  if (workoutProblems.length < 3) {
    const hasRevision = workoutProblems.length > 0 && workoutProblems[0].tag === "REVISION";
    const revisionPatterns = hasRevision ? workoutProblems[0].topics : [];

    const remainingUnsolved = unsolvedProblems.filter((p) => {
      if (selectedIds.has(p.id)) return false;
      if (hasRevision) {
        return p.patterns?.some((pat: string) => revisionPatterns.includes(pat));
      }
      return true;
    });

    const needCount = 3 - workoutProblems.length;
    remainingUnsolved.slice(0, needCount).forEach((p) => {
      workoutProblems.push(toWorkoutProblem(p, hasRevision ? "DISCOVERY" : "NEW", solvedToday));
      selectedIds.add(p.id);
      selectedSlugs.add(p.title_slug);
    });
  }

  // 7. Fallback: If still not enough, fetch random unsolved Medium/Hard problems directly from LeetCode
  if (workoutProblems.length < 3) {
    const needCount = 3 - workoutProblems.length;
    console.log(`Workout still needs ${needCount} slot(s). Fetching random Medium/Hard problems from LeetCode...`);

    let attempts = 0;
    const maxAttempts = 3;

    while (workoutProblems.length < 3 && attempts < maxAttempts) {
      attempts++;
      // Randomly choose difficulty: Medium or Hard
      const diff = Math.random() > 0.5 ? "MEDIUM" : "HARD";
      const fetched = await fetchRandomLeetCodeProblems(diff, 30);

      for (const q of fetched) {
        if (workoutProblems.length >= 3) break;

        // Skip Database questions
        if (q.topicTags?.some((t) => t.slug === "database" || t.name === "Database")) {
          continue;
        }

        // Must not be already solved/progressed by user
        if (solvedSlugs.has(q.titleSlug)) continue;

        // Must not be selected in current workout
        if (selectedSlugs.has(q.titleSlug)) continue;

        // Check if it already exists in the local database
        const dbProb = dbSlugToProblem.get(q.titleSlug);
        if (dbProb) {
          // If it exists in local DB but is unsolved, we can use it
          workoutProblems.push(toWorkoutProblem(dbProb, "NEW", solvedToday));
          selectedIds.add(dbProb.id);
          selectedSlugs.add(dbProb.title_slug);
        } else {
          // Problem does not exist in DB, fetch details and insert it
          const patterns = q.topicTags?.map((t) => t.name) || [];
          const difficultyMapped = q.difficulty === "Medium" ? "Medium" : q.difficulty === "Hard" ? "Hard" : "Medium";
          
          const { data: newProb, error: insertError } = await supabase
            .from("problems")
            .insert({
              title: q.title,
              leetcode_num: parseInt(q.frontendQuestionId, 10) || 0,
              title_slug: q.titleSlug,
              difficulty: difficultyMapped,
              patterns,
              url: `https://leetcode.com/problems/${q.titleSlug}`,
            })
            .select("*")
            .single();

          if (insertError || !newProb) {
            console.error("Failed to insert dynamically fetched random fallback problem:", insertError);
            continue;
          }

          const typedNewProb = newProb as unknown as DatabaseProblem;
          workoutProblems.push(toWorkoutProblem(typedNewProb, "NEW", solvedToday));
          selectedIds.add(typedNewProb.id);
          selectedSlugs.add(typedNewProb.title_slug);
          dbSlugToProblem.set(q.titleSlug, typedNewProb);
        }
      }
    }
  }

  return workoutProblems;
}
