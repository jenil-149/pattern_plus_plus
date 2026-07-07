"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDateStr } from "./utils";
import { rateWorkoutProblem } from "./rate-problem";

/**
 * Toggles a workout problem's solved state. If marking solved, defaults to mid-level rating.
 */
export async function toggleWorkoutProblemSolved(
  problemId: string,
  isSolved: boolean
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const todayStr = getLocalDateStr(new Date());

  if (isSolved) {
    // Default to rating 3 (quality 3: correct recall with difficulty)
    await rateWorkoutProblem(problemId, 3);
  } else {
    // 1. Delete today's activity log entry
    await supabase
      .from("activity_log")
      .delete()
      .eq("user_id", user.id)
      .eq("problem_id", problemId)
      .eq("solved_at", todayStr);

    // 2. Check if they have other activity log entries for this problem
    const { data: otherLogs } = await supabase
      .from("activity_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("problem_id", problemId);

    if (!otherLogs || otherLogs.length === 0) {
      // Delete user progress entirely if they never solved it before
      await supabase
        .from("user_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("problem_id", problemId);
    } else {
      // Revert to learning state if there are older solves
      await supabase
        .from("user_progress")
        .update({
          repetitions: 0,
          easiness_factor: 2.5,
          interval: 1,
          next_review_date: todayStr,
          status: "learning",
        })
        .eq("user_id", user.id)
        .eq("problem_id", problemId);
    }
  }
}
