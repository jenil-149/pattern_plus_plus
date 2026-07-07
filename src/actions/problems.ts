"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchProblemDetails } from "@/lib/leetcode";

/**
 * Parses and extracts the LeetCode title slug from a string (can be a raw slug or a URL).
 */
function extractSlug(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http")) {
    try {
      const url = new URL(trimmed);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const problemsIndex = pathParts.indexOf("problems");
      if (problemsIndex !== -1 && pathParts[problemsIndex + 1]) {
        return pathParts[problemsIndex + 1];
      }
    } catch {
      // Return trimmed input on URL parse failure
    }
  }

  // Remove trailing slashes and take the last part if they copied a slug with slashes
  return trimmed.replace(/\/$/, "").split("/").pop() || trimmed;
}

/**
 * Fetches problem metadata from LeetCode and adds it to the Problem Bank.
 * 
 * @param searchInput LeetCode problem title slug or URL
 */
export async function addProblemBySlug(searchInput: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const titleSlug = extractSlug(searchInput);
  if (!titleSlug) {
    throw new Error("Please enter a valid LeetCode slug or URL");
  }

  // 1. Check if problem already exists in database
  const { data: existing, error: fetchError } = await supabase
    .from("problems")
    .select("id")
    .eq("title_slug", titleSlug)
    .maybeSingle();

  if (fetchError) {
    console.error("Error checking existing problem:", fetchError);
  }

  if (existing) {
    throw new Error("This problem already exists in the Problem Bank.");
  }

  // 2. Query LeetCode GraphQL for details
  const details = await fetchProblemDetails(titleSlug);
  if (!details) {
    throw new Error(
      `Could not retrieve question details for "${titleSlug}" from LeetCode. Please verify the URL/slug.`
    );
  }

  // Reject Database questions
  if (details.patterns?.includes("Database")) {
    throw new Error("Database questions are not supported.");
  }

  // 3. Insert problem into DB
  const { error: insertError } = await supabase.from("problems").insert({
    title: details.title,
    leetcode_num: details.leetcode_num,
    title_slug: details.title_slug,
    difficulty: details.difficulty,
    patterns: details.patterns,
    url: `https://leetcode.com/problems/${details.title_slug}`,
  });

  if (insertError) {
    console.error("Error adding problem to database:", insertError);
    throw new Error(`Failed to add problem: ${insertError.message}`);
  }
}

function getLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * One-time rebalance of existing review dates.
 * Schedules all active review problems consecutively starting from today with no gaps.
 * Gaps are filled by pulling forward future problems, and overloads are pushed forward.
 */
export async function rebalanceReviewDates(): Promise<{
  success: boolean;
  message: string;
  moved: number;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated", moved: 0 };
  }

  // Fetch all non-mastered review dates
  const { data: allProgress, error } = await supabase
    .from("user_progress")
    .select("id, problem_id, next_review_date")
    .eq("user_id", user.id)
    .neq("next_review_date", "9999-12-31")
    .neq("status", "mastered")
    .order("next_review_date", { ascending: true });

  if (error || !allProgress) {
    console.error("Error fetching progress for rebalance:", error);
    return { success: false, message: "Failed to fetch review data", moved: 0 };
  }

  let movedCount = 0;
  const today = new Date();

  for (let i = 0; i < allProgress.length; i++) {
    const entry = allProgress[i];
    
    // Calculate consecutive date starting from today
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const candidateDate = getLocalDateStr(targetDate);
    
    if (entry.next_review_date !== candidateDate) {
      const { error: updateError } = await supabase
        .from("user_progress")
        .update({ next_review_date: candidateDate })
        .eq("id", entry.id);

      if (updateError) {
        console.error("Error moving review date:", updateError);
        continue;
      }
      movedCount++;
    }
  }

  if (movedCount > 0) {
    return {
      success: true,
      message: `Rebalanced! Scheduled ${allProgress.length} reviews consecutively starting from today with no gaps (moved ${movedCount} review${movedCount === 1 ? "" : "s"}).`,
      moved: movedCount,
    };
  }

  return {
    success: true,
    message: "All review dates are already perfectly balanced with no gaps! No changes needed.",
    moved: 0,
  };
}
