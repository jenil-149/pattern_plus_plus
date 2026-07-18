import { DatabaseProblem, WorkoutProblem } from "./types";
export { getLocalDateStr } from "@/lib/utils";

export function patternToSlug(pattern: string): string {
  return pattern.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Checks if a problem exists in the local database, and if not, fetches details
 * via the provided callback and inserts it.
 */
export async function getOrInsertProblem(
  supabase: any,
  titleSlug: string,
  fetchDetails: () => Promise<{
    title: string;
    leetcode_num: number;
    title_slug: string;
    difficulty: string;
    patterns: string[];
  } | null>
): Promise<DatabaseProblem | null> {
  const { data: existing } = await supabase
    .from("problems")
    .select("*")
    .eq("title_slug", titleSlug)
    .maybeSingle();

  if (existing) {
    return existing as unknown as DatabaseProblem;
  }

  const details = await fetchDetails();
  if (!details) return null;

  const difficulty = details.difficulty === "Hard" ? "Hard" : details.difficulty === "Easy" ? "Easy" : "Medium";

  const { data: inserted, error } = await supabase
    .from("problems")
    .insert({
      title: details.title,
      leetcode_num: details.leetcode_num,
      title_slug: details.title_slug,
      difficulty,
      patterns: details.patterns,
      url: `https://leetcode.com/problems/${details.title_slug}`,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error inserting problem:", error);
    return null;
  }

  return inserted as unknown as DatabaseProblem;
}


/**
 * Transforms a DatabaseProblem into a WorkoutProblem for the UI.
 */
export function toWorkoutProblem(
  prob: DatabaseProblem,
  tag: "REVISION" | "DISCOVERY" | "NEW",
  solvedToday: Map<string, number>
): WorkoutProblem {
  const solvedLog = solvedToday.get(prob.id);
  return {
    id: prob.id,
    title: prob.title,
    leetcodeNo: `#LC-${prob.leetcode_num}`,
    leetcode_num: prob.leetcode_num,
    title_slug: prob.title_slug,
    url: prob.url || `https://leetcode.com/problems/${prob.title_slug}`,
    difficulty: (prob.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
    topics: prob.patterns || [],
    tag,
    isSolved: solvedLog !== undefined,
    rating: solvedLog !== undefined ? solvedLog : null, // UI rating 1-5 maps directly to quality 1-5
  };
}
