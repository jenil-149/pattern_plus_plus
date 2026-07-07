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

export interface DatabaseUserProgress {
  id: string;
  user_id: string;
  problem_id: string;
  easiness_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at: string;
  status: string;
  stuck_note: string | null;
}
