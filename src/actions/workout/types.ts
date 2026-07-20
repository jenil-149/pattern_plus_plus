export interface WorkoutProblem {
  id: string;
  title: string;
  leetcodeNo: string;
  leetcode_num: number;
  title_slug: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  tag: "REVISION" | "DISCOVERY" | "NEW";
  isSolved: boolean;
  rating: number | null;
}

export interface DatabaseProblem {
  id: string;
  title: string;
  leetcode_num: number;
  title_slug: string;
  difficulty: string;
  url: string;
  patterns: string[];
}

