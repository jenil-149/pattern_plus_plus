"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchRecentSubmissions, fetchProblemDetails } from "@/lib/leetcode";
import { calculateSM2 } from "@/lib/sm2";
import { getBalancedReviewDate } from "@/lib/review-spread";

function getLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface SyncResult {
  success: boolean;
  message: string;
  count: number;
}

interface DatabaseProblem {
  id: string;
  title_slug: string;
  patterns?: string[];
  difficulty: string;
}

/**
 * Synchronizes recent accepted LeetCode submissions with the user's progress and activity log.
 */
export async function syncLeetCodeSubmissions(): Promise<SyncResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated", count: 0 };
  }

  // 1. Fetch user's LeetCode username
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("leetcode_username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.leetcode_username) {
    return {
      success: false,
      message: "Please configure your LeetCode username in Settings first.",
      count: 0,
    };
  }
  // 2. Query LeetCode GraphQL API
  let submissions;
  try {
    submissions = await fetchRecentSubmissions(profile.leetcode_username, 100);
  } catch (err) {
    console.error("LeetCode Sync Error:", err);
    return {
      success: false,
      message: "Failed to connect to LeetCode API. Check username or try again later.",
      count: 0,
    };
  }

  // 3. The API now returns only accepted solves directly
  if (submissions.length === 0) {
    return {
      success: true,
      message: "No recent accepted submissions found on LeetCode.",
      count: 0,
    };
  }

  // 4. Fetch all problems in the master bank
  const { data: problems, error: problemsError } = await supabase
    .from("problems")
    .select("id, title_slug, patterns, difficulty");

  if (problemsError) {
    console.error("Error fetching problems from bank:", problemsError);
  }

  const typedProblems = (problems || []) as unknown as DatabaseProblem[];
  // Filter out any Database questions from the bank lookup
  const nonDbProblems = typedProblems.filter(p => !p.patterns?.includes("Database"));
  const slugToProblem = new Map<string, DatabaseProblem>(
    nonDbProblems.map((p) => [p.title_slug, p])
  );

  // 5. Fetch all user's logs to prevent duplicate entries
  const { data: userLogs, error: logsError } = await supabase
    .from("activity_log")
    .select("problem_id, solved_at")
    .eq("user_id", user.id);

  if (logsError) {
    console.error("Error fetching activity logs:", logsError);
  }

  const loggedSet = new Set<string>(
    userLogs?.map((log) => `${log.problem_id}_${log.solved_at}`) || []
  );

  let importedCount = 0;

  // 6. Process each accepted submission
  for (const sub of submissions) {
    let dbProb = slugToProblem.get(sub.titleSlug);
    let problemId = dbProb?.id;
    let difficulty = dbProb?.difficulty;
    
    // If problem is not in local DB, fetch its details from LeetCode dynamically
    if (!problemId) {
      console.log(`Problem ${sub.titleSlug} not found in DB. Fetching from LeetCode...`);
      const details = await fetchProblemDetails(sub.titleSlug);
      
      if (details) {
        // Skip Database questions
        if (details.patterns?.includes("Database")) {
          console.log(`Skipping Database question: ${details.title}`);
          continue;
        }

        const { data: newProb, error: insertError } = await supabase
          .from("problems")
          .insert({
            title: details.title,
            leetcode_num: details.leetcode_num,
            title_slug: details.title_slug,
            difficulty: details.difficulty,
            patterns: details.patterns,
            url: `https://leetcode.com/problems/${details.title_slug}`,
          })
          .select("id, title_slug, difficulty, patterns")
          .single();

        if (insertError || !newProb || !newProb.id) {
          console.error("Failed to insert dynamically fetched problem:", insertError);
          continue;
        }

        const typedNewProb = newProb as unknown as DatabaseProblem;
        problemId = typedNewProb.id;
        difficulty = typedNewProb.difficulty;
        slugToProblem.set(details.title_slug, typedNewProb);
      } else {
        continue; // Skip if we failed to fetch details
      }
    }

    if (!problemId) {
      continue;
    }

    const timestampSec = parseInt(sub.timestamp, 10);
    if (isNaN(timestampSec)) {
      continue;
    }
    const subDate = new Date(timestampSec * 1000);
    const dateStr = getLocalDateStr(subDate);
    const key = `${problemId}_${dateStr}`;

    // Skip if already logged for this specific day
    if (loggedSet.has(key)) {
      continue;
    }

    // Retrieve previous progress if any
    const { data: currentProgress, error: fetchProgressError } = await supabase
      .from("user_progress")
      .select("repetitions, easiness_factor, interval, status, next_review_date")
      .eq("user_id", user.id)
      .eq("problem_id", problemId)
      .maybeSingle();

    if (fetchProgressError) {
      console.error("Error fetching progress:", fetchProgressError);
    }

    const repetitions = currentProgress?.repetitions ?? 0;
    const easinessFactor = currentProgress?.easiness_factor ?? 2.5;
    const interval = currentProgress?.interval ?? 0;

    // Use default recall quality 4 (corresponds to UI rating 3 - perfect hesitation recall)
    const quality = 4;

    const sm2Result = calculateSM2({
      quality,
      repetitions,
      easinessFactor,
      interval,
    });

    const isEasy = difficulty === "Easy";
    const wasMastered = currentProgress?.status === "mastered" || currentProgress?.next_review_date === "9999-12-31";
    const isMastered = sm2Result.repetitions >= 5 || wasMastered;

    let nextReviewDateStr = "";
    let status = "";

    if (isEasy || isMastered) {
      nextReviewDateStr = "9999-12-31";
      status = "mastered";
    } else {
      nextReviewDateStr = await getBalancedReviewDate(user.id, getLocalDateStr(sm2Result.nextReviewDate), problemId);
      status = "learning";
    }

    // Update user progress table
    const { error: progressError } = await supabase.from("user_progress").upsert(
      {
        user_id: user.id,
        problem_id: problemId,
        easiness_factor: sm2Result.easinessFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        next_review_date: nextReviewDateStr,
        last_reviewed_at: subDate.toISOString(),
        status,
      },
      {
        onConflict: "user_id,problem_id",
      }
    );

    if (progressError) {
      console.error("Error updating progress on sync:", progressError);
      continue;
    }

    // Insert to activity log
    const { error: insertLogError } = await supabase.from("activity_log").insert({
      user_id: user.id,
      problem_id: problemId,
      solved_at: dateStr,
      quality,
    });

    if (insertLogError) {
      console.error("Error logging sync activity:", insertLogError);
      continue;
    }

    // Add to in-memory set to prevent double logging in this batch
    loggedSet.add(key);
    importedCount++;
  }

  if (importedCount > 0) {
    return {
      success: true,
      message: `Sync complete! Successfully imported ${importedCount} solve${
        importedCount === 1 ? "" : "s"
      } from LeetCode.`,
      count: importedCount,
    };
  }

  return {
    success: true,
    message: "Already up to date. No new solves to sync.",
    count: 0,
  };
}
