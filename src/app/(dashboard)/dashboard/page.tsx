export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { WorkoutSection } from "@/components/workout/WorkoutSection";
import { SyncButton } from "@/components/dashboard/SyncButton";
import { getDashboardStats, getHeatmapData } from "@/actions/activity";
import { getDailyWorkout } from "@/actions/workout";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch all dashboard data concurrently
  const [stats, heatmapData, dailyWorkout] = await Promise.all([
    getDashboardStats(),
    getHeatmapData(),
    getDailyWorkout(),
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white font-heading">Overview</h1>
          <p className="text-zinc-400 mt-1.5 text-sm md:text-base font-sans">
            Your current performance metrics and daily tasks.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <SyncButton />
        </div>
      </div>

      {/* 280-Day Activity Consistency Card */}
      <div className="bg-[#0c0c0e]/95 border border-zinc-800/80 rounded-xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        {/* Card Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">280-Day Activity</h2>
            <div className="text-[10px] font-bold text-zinc-500 tracking-widest font-sans uppercase">
              CONSISTENCY METRIC
            </div>
          </div>

          {/* Stats component displaying active days, streak, and total solved */}
          <StreakCard
            currentStreak={stats.currentStreak}
            activeDays={stats.activeDays}
            totalSolved={stats.totalSolved}
          />
        </div>

        {/* Heatmap Grid Component */}
        <Heatmap activityData={heatmapData} cols={40} rows={7} />
      </div>

      {/* Daily Workout Section */}
      <WorkoutSection initialProblems={dailyWorkout} />
    </div>
  );
}
