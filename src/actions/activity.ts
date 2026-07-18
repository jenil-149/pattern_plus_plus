"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDateStr } from "@/lib/utils";

export interface DashboardStats {
  currentStreak: number;
  activeDays: number;
  totalSolved: number;
}

/**
 * Fetches dashboard statistics (active streak, active days, total solved count)
 * for the currently authenticated user.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { currentStreak: 0, activeDays: 0, totalSolved: 0 };
  }

  // 1. Get total solved count from user_progress (problems user has attempted/marked)
  const { count, error: countError } = await supabase
    .from("user_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    console.error("Error fetching total solved count:", countError);
  }

  const totalSolved = count || 0;

  // 2. Fetch all unique activity dates from activity_log to calculate streak and active days
  const { data: activityData, error: activityError } = await supabase
    .from("activity_log")
    .select("solved_at")
    .eq("user_id", user.id);

  if (activityError) {
    console.error("Error fetching activity log:", activityError);
    return { currentStreak: 0, activeDays: 0, totalSolved };
  }

  if (!activityData || activityData.length === 0) {
    return { currentStreak: 0, activeDays: 0, totalSolved };
  }

  // Extract unique dates and sort them descending (newest first)
  const uniqueDates = Array.from(
    new Set(activityData.map((a) => a.solved_at))
  ).sort((a, b) => b.localeCompare(a));

  const activeDays = uniqueDates.length;

  // Calculate current streak
  let currentStreak = 0;
  if (activeDays > 0) {
    const todayStr = getLocalDateStr(new Date(), undefined, true);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday, undefined, true);

    // If the most recent solve is today or yesterday, the streak is alive
    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      currentStreak = 1;
      let checkDate = new Date(uniqueDates[0]);

      for (let i = 1; i < uniqueDates.length; i++) {
        const expectedPrev = new Date(checkDate);
        expectedPrev.setDate(expectedPrev.getDate() - 1);
        const expectedPrevStr = getLocalDateStr(expectedPrev, undefined, true);

        if (uniqueDates[i] === expectedPrevStr) {
          currentStreak++;
          checkDate = new Date(uniqueDates[i]);
        } else {
          break;
        }
      }
    }
  }

  return {
    currentStreak,
    activeDays,
    totalSolved,
  };
}

/**
 * Fetches activity counts grouped by local date string for the last 280 days.
 */
export async function getHeatmapData(): Promise<Record<string, number>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {};
  }

  // Look back 280 days to cover a 40x7 grid
  const daysAgoLimit = 280;
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - daysAgoLimit);
  const limitDateStr = getLocalDateStr(limitDate, undefined, true);

  const { data, error } = await supabase
    .from("activity_log")
    .select("solved_at")
    .eq("user_id", user.id)
    .gte("solved_at", limitDateStr);

  if (error) {
    console.error("Error fetching heatmap data:", error);
    return {};
  }

  const heatmap: Record<string, number> = {};
  data?.forEach((row) => {
    heatmap[row.solved_at] = (heatmap[row.solved_at] || 0) + 1;
  });

  return heatmap;
}
