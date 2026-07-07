import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProblemBankClient } from "@/components/problems/ProblemBankClient";

export default async function ProblemsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch problems and progress concurrently
  const [problemsRes, progressRes] = await Promise.all([
    supabase
      .from("problems")
      .select("*")
      .order("leetcode_num", { ascending: true }),
    supabase
      .from("user_progress")
      .select("problem_id, status, next_review_date")
      .eq("user_id", user.id),
  ]);

  if (problemsRes.error) {
    console.error("Error fetching problems:", problemsRes.error);
  }

  if (progressRes.error) {
    console.error("Error fetching progress records:", progressRes.error);
  }

  const problems = (problemsRes.data || []).filter(
    (p) => !p.patterns?.includes("Database")
  );

  return (
    <ProblemBankClient
      problems={problems}
      progress={progressRes.data || []}
    />
  );
}
