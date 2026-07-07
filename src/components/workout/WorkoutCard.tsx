"use client";

import { Check, ExternalLink } from "lucide-react";

export type WorkoutTag = "REVISION" | "DISCOVERY" | "NEW";
export type WorkoutDifficulty = "Easy" | "Medium" | "Hard";

interface WorkoutCardProps {
  title: string;
  leetcodeNo: string;
  tag: WorkoutTag;
  difficulty?: WorkoutDifficulty;
  topics: string[];
  url?: string;
  rating?: number | null;
  onRate?: (rating: number) => void;
  isSolved: boolean;
  onToggleSolved: () => void;
  hasTopAccent?: boolean;
}

export function WorkoutCard({
  title,
  leetcodeNo,
  tag,
  difficulty,
  topics,
  url,
  rating,
  onRate,
  isSolved,
  onToggleSolved,
  hasTopAccent = false,
}: WorkoutCardProps) {
  const getTagStyles = (t: WorkoutTag) => {
    switch (t) {
      case "REVISION":
        return "bg-[#3c1d15] text-[#ff8452] border border-[#ff8452]/20";
      case "DISCOVERY":
        return "bg-[#132c2c] text-[#4ed8c4] border border-[#4ed8c4]/20";
      case "NEW":
        return "bg-[#1b203a] text-[#8c9eff] border border-[#8c9eff]/20";
      default:
        return "bg-zinc-800 text-zinc-300 border border-zinc-700";
    }
  };

  const getDifficultyStyles = (d: WorkoutDifficulty) => {
    switch (d) {
      case "Hard":
        return "bg-[#3e1b1b] text-[#ff6b6b] border border-[#ff6b6b]/20";
      case "Medium":
        return "bg-[#3a2a15] text-[#f59e0b] border border-[#f59e0b]/20";
      case "Easy":
        return "bg-[#1b3a1e] text-[#4ade80] border border-[#4ade80]/20";
      default:
        return "bg-zinc-800 text-zinc-400 border border-zinc-800";
    }
  };

  return (
    <div
      className={`bg-[#0c0c0e]/90 border border-zinc-800/80 rounded-xl overflow-hidden flex flex-col justify-between shadow-lg hover:border-zinc-700/80 transition-all duration-300 ${
        hasTopAccent ? "border-t-2 border-t-[#cd5219]" : ""
      }`}
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span
            className={`px-2.5 py-0.5 font-bold tracking-wide rounded-full text-[10px] font-sans uppercase ${getTagStyles(
              tag
            )}`}
          >
            {tag}
          </span>
          <span className="text-zinc-500 font-semibold font-mono">{leetcodeNo}</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white font-heading tracking-tight">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#cd5219] hover:underline transition-colors duration-150"
              >
                <span>{title}</span>
                <ExternalLink className="h-4 w-4 opacity-40 shrink-0" />
              </a>
            ) : (
              title
            )}
          </h3>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {difficulty && (
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-sans uppercase tracking-wider ${getDifficultyStyles(
                  difficulty
                )}`}
              >
                {difficulty}
              </span>
            )}
            {topics.map((topic) => (
              <span
                key={topic}
                className="px-2 py-0.5 text-[11px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full font-sans"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-zinc-850/60 bg-zinc-950/20 space-y-4">
        {onRate && (
          <div>
            <div className="text-[10px] font-bold text-zinc-500 tracking-wider font-sans uppercase mb-2">
              RATE MASTERY (1-5)
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => onRate(num)}
                  className={`w-9 h-9 flex items-center justify-center font-semibold rounded text-sm transition-all duration-200 border cursor-pointer ${
                    rating === num
                      ? "bg-[#cd5219] border-[#cd5219] text-white shadow-[0_0_10px_rgba(205,82,25,0.4)] scale-105"
                      : "bg-zinc-900 border-zinc-800 text-zinc-350 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onToggleSolved}
          className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 text-sm font-semibold border ${
            isSolved
              ? "bg-[#132c2c] border-[#132c2c] text-[#4ed8c4]"
              : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          <Check
            className={`h-4 w-4 transition-transform duration-200 ${
              isSolved ? "scale-110" : ""
            }`}
          />
          <span>{isSolved ? "Solved!" : "Mark as Solved"}</span>
        </button>
      </div>
    </div>
  );
}
