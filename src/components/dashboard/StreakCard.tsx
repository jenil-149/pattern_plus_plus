"use client";

interface StreakCardProps {
  currentStreak: number;
  activeDays: number;
  totalSolved: number;
}

export function StreakCard({
  currentStreak,
  activeDays,
  totalSolved,
}: StreakCardProps) {
  return (
    <div className="flex items-center gap-4 md:gap-6 self-start sm:self-center">
      {/* Active Days */}
      <div className="text-center sm:text-right">
        <div className="text-3xl font-extrabold text-amber-300 font-sans tracking-tight">
          {activeDays}
        </div>
        <div className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase mt-0.5">
          ACTIVE DAYS
        </div>
      </div>

      <div className="h-10 w-[1px] bg-zinc-800" />

      {/* Streak */}
      <div className="text-center sm:text-right">
        <div className="text-3xl font-extrabold text-amber-300 font-sans tracking-tight">
          {currentStreak}
        </div>
        <div className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase mt-0.5">
          CURRENT STREAK
        </div>
      </div>

      <div className="h-10 w-[1px] bg-zinc-800" />

      {/* Total Solved */}
      <div className="text-center sm:text-right">
        <div className="text-3xl font-extrabold text-white font-sans tracking-tight">
          {totalSolved}
        </div>
        <div className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase mt-0.5">
          TOTAL SOLVED
        </div>
      </div>
    </div>
  );
}
