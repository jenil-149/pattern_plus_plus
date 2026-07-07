import { DatabaseProblem, WorkoutProblem } from "./types";

export function getLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function patternToSlug(pattern: string): string {
  return pattern.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
