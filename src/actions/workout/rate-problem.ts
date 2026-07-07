"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateSM2 } from "@/lib/sm2";
import { getBalancedReviewDate } from "@/lib/review-spread";
import { getLocalDateStr } from "./utils";

/**
 * Rates the workout problem using the SM-2 algorithm, updates user progress, and logs activity.
 */
export async function rateWorkoutProblem(
  problemId: string,
  rating: number
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Map UI rating (1-5) directly to SM-2 quality (1-5)
  const quality = rating;

  // 1. Fetch current progress
  const { data: currentProgress, error: fetchError } = await supabase
    .from("user_progress")
    .select("repetitions, easiness_factor, interval")
    .eq("user_id", user.id)
    .eq("problem_id", problemId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching user progress:", fetchError);
  }

  const repetitions = currentProgress?.repetitions ?? 0;
  const easinessFactor = currentProgress?.easiness_factor ?? 2.5;
  const interval = currentProgress?.interval ?? 0;

  // 2. Calculate next status using SM-2
  const sm2Result = calculateSM2({
    quality,
    repetitions,
    easinessFactor,
    interval,
  });

  // Fetch problem difficulty to see if we should exclude it from future revisions
  const { data: problemData, error: problemError } = await supabase
    .from("problems")
    .select("difficulty")
    .eq("id", problemId)
    .single();

  if (problemError) {
    console.error("Error fetching problem difficulty:", problemError);
  }

  let nextReviewDateStr = getLocalDateStr(sm2Result.nextReviewDate);
  let status = sm2Result.repetitions >= 5 ? "mastered" : "learning";

  // If the problem is Easy or Mastered, do not schedule it for future revisions
  const isEasy = problemData?.difficulty === "Easy";
  if (isEasy || status === "mastered") {
    nextReviewDateStr = "9999-12-31";
    status = "mastered";
  } else {
    // Load-balance review dates to avoid too many reviews on one day (only for non-easy/non-mastered problems)
    nextReviewDateStr = await getBalancedReviewDate(user.id, nextReviewDateStr, problemId);
  }

  // 3. Upsert progress
  const { error: upsertProgressError } = await supabase
    .from("user_progress")
    .upsert(
      {
        user_id: user.id,
        problem_id: problemId,
        easiness_factor: sm2Result.easinessFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        next_review_date: nextReviewDateStr,
        last_reviewed_at: new Date().toISOString(),
        status,
      },
      {
        onConflict: "user_id,problem_id",
      }
    );

  if (upsertProgressError) {
    console.error("Error updating user progress:", upsertProgressError);
    throw upsertProgressError;
  }

  // 4. Log solving activity
  const todayStr = getLocalDateStr(new Date());

  // Clean old log for today to prevent duplicates
  await supabase
    .from("activity_log")
    .delete()
    .eq("user_id", user.id)
    .eq("problem_id", problemId)
    .eq("solved_at", todayStr);

  const { error: logError } = await supabase.from("activity_log").insert({
    user_id: user.id,
    problem_id: problemId,
    solved_at: todayStr,
    quality,
  });

  if (logError) {
    console.error("Error inserting activity log:", logError);
    throw logError;
  }
}
