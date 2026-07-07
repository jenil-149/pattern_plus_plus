import { createClient } from "@/lib/supabase/server";

/** Maximum number of problems to review on a single day */
const MAX_REVIEWS_PER_DAY = 1;

/** Maximum number of days to search ahead for an open slot */
const MAX_SPREAD_DAYS = 60;

function getLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return getLocalDateStr(d);
}

/**
 * Finds the best review date by load-balancing across days.
 * 
 * Given a target date from the SM-2 algorithm, checks how many reviews are
 * already scheduled for that day. If the day is at capacity (>= MAX_REVIEWS_PER_DAY),
 * pushes the review to the next available day with capacity.
 * 
 * @param userId - The authenticated user's ID
 * @param targetDateStr - The ideal review date from SM-2 (YYYY-MM-DD)
 * @param currentProblemId - The problem being rated (excluded from the count)
 * @returns The load-balanced review date string (YYYY-MM-DD)
 */
export async function getBalancedReviewDate(
  userId: string,
  targetDateStr: string,
  currentProblemId: string
): Promise<string> {
  // Don't spread mastered/archived problems (sentinel date)
  if (targetDateStr === "9999-12-31") {
    return targetDateStr;
  }

  const supabase = await createClient();

  // Calculate the date range we need to check (target date + MAX_SPREAD_DAYS ahead)
  const endDateStr = addDays(targetDateStr, MAX_SPREAD_DAYS);

  // Fetch all reviews scheduled in the window [targetDate, targetDate + MAX_SPREAD_DAYS]
  const { data: scheduledReviews, error } = await supabase
    .from("user_progress")
    .select("problem_id, next_review_date")
    .eq("user_id", userId)
    .gte("next_review_date", targetDateStr)
    .lte("next_review_date", endDateStr)
    .neq("next_review_date", "9999-12-31")
    .neq("problem_id", currentProblemId);

  if (error) {
    console.error("Error fetching scheduled reviews for load balancing:", error);
    // On error, fall back to the original date — don't block the rating flow
    return targetDateStr;
  }

  // Build a count map of reviews per day
  const countByDate = new Map<string, number>();
  for (const review of scheduledReviews || []) {
    const date = review.next_review_date;
    countByDate.set(date, (countByDate.get(date) || 0) + 1);
  }

  // Check the target date first, then push forward day by day
  let candidateDate = targetDateStr;
  for (let offset = 0; offset <= MAX_SPREAD_DAYS; offset++) {
    candidateDate = addDays(targetDateStr, offset);
    const currentCount = countByDate.get(candidateDate) || 0;

    if (currentCount < MAX_REVIEWS_PER_DAY) {
      return candidateDate;
    }
  }

  // If all days in the window are full (unlikely), use the last checked date
  return candidateDate;
}
