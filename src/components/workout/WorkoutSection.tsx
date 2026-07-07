"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2 } from "lucide-react";
import { WorkoutCard } from "./WorkoutCard";
import { getDailyWorkout, rateWorkoutProblem, toggleWorkoutProblemSolved, WorkoutProblem } from "@/actions/workout";
import { toast } from "sonner";

interface WorkoutSectionProps {
  initialProblems: WorkoutProblem[];
}

export function WorkoutSection({ initialProblems }: WorkoutSectionProps) {
  const [problems, setProblems] = useState<WorkoutProblem[]>(initialProblems);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const router = useRouter();

  // Compute the client's local date string once (YYYY-MM-DD)
  // This is passed to server actions so they use the user's local date
  // regardless of what timezone the server is in (Vercel runs UTC).
  const getClientTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Sync with fresh server data whenever the parent re-fetches (e.g. after router.refresh())
  // Also re-fetch on mount using the CLIENT's local date so the workout matches
  // the user's timezone (server may be UTC, user may be IST).
  useEffect(() => {
    setProblems(initialProblems);
  }, [initialProblems]);

  useEffect(() => {
    getDailyWorkout(getClientTodayStr()).then(setProblems).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRate = async (problemId: string, rating: number) => {
    setLoadingMap((prev) => ({ ...prev, [problemId]: true }));
    try {
      const todayStr = getClientTodayStr();
      await rateWorkoutProblem(problemId, rating, todayStr);
      
      setProblems((prev) =>
        prev.map((p) =>
          p.id === problemId ? { ...p, isSolved: true, rating } : p
        )
      );
      
      toast.success("Progress saved successfully!");
      // Re-fetch with client date so problems reflect the user's local date
      getDailyWorkout(todayStr).then(setProblems).catch(console.error);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save progress rating.");
    } finally {
      setLoadingMap((prev) => ({ ...prev, [problemId]: false }));
    }
  };

  const handleToggleSolved = async (problemId: string, isCurrentlySolved: boolean) => {
    setLoadingMap((prev) => ({ ...prev, [problemId]: true }));
    const nextSolved = !isCurrentlySolved;
    try {
      const todayStr = getClientTodayStr();
      await toggleWorkoutProblemSolved(problemId, nextSolved, todayStr);

      setProblems((prev) =>
        prev.map((p) =>
          p.id === problemId
            ? {
                ...p,
                isSolved: nextSolved,
                rating: nextSolved ? 3 : null,
              }
            : p
        )
      );

      if (nextSolved) {
        toast.success("Problem marked as solved!");
      } else {
        toast.success("Problem marked as unsolved.");
      }
      
      getDailyWorkout(todayStr).then(setProblems).catch(console.error);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update solved status.");
    } finally {
      setLoadingMap((prev) => ({ ...prev, [problemId]: false }));
    }
  };


  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#cd5219]/10 rounded-lg">
            <Dumbbell className="h-5 w-5 text-[#cd5219]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-heading">
            Daily Workout
          </h2>
        </div>

        {Object.values(loadingMap).some(Boolean) && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium font-sans">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#cd5219]" />
            Saving...
          </div>
        )}
      </div>

      {problems.length === 0 ? (
        <div className="bg-[#0c0c0e]/40 border border-zinc-800/60 rounded-xl p-8 text-center text-zinc-400 text-sm font-sans">
          No workout problems available today. Try adding some problems to the Problem Bank!
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem, idx) => (
            <WorkoutCard
              key={problem.id}
              title={problem.title}
              leetcodeNo={problem.leetcodeNo}
              tag={problem.tag}
              difficulty={problem.difficulty}
              topics={problem.topics}
              url={problem.url}
              rating={problem.rating}
              onRate={(rating) => handleRate(problem.id, rating)}
              isSolved={problem.isSolved}
              onToggleSolved={() => handleToggleSolved(problem.id, problem.isSolved)}
              hasTopAccent={idx === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
