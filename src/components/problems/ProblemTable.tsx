"use client";

import { ArrowUpDown, ExternalLink, Check, Library } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface Problem {
  id: string;
  title: string;
  leetcode_num: number;
  title_slug: string;
  difficulty: string;
  url: string;
  patterns: string[];
}

interface ProblemTableProps {
  filteredProblems: Problem[];
  sortBy: "num" | "difficulty" | "next_review";
  sortAsc: boolean;
  toggleSort: (type: "num" | "difficulty" | "next_review") => void;
  getProblemStatus: (id: string) => string;
  getNextReviewDate: (id: string) => string;
}

export function ProblemTable({
  filteredProblems,
  sortBy,
  sortAsc,
  toggleSort,
  getProblemStatus,
  getNextReviewDate,
}: ProblemTableProps) {
  const getDifficultyBadgeClass = (diff: string) => {
    switch (diff) {
      case "Hard":
        return "bg-[#3e1b1b] text-[#ff6b6b] border border-[#ff6b6b]/15";
      case "Medium":
        return "bg-[#3a2a15] text-[#f59e0b] border border-[#f59e0b]/15";
      case "Easy":
        return "bg-[#1b3a1e] text-[#4ade80] border border-[#4ade80]/15";
      default:
        return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "mastered":
        return "bg-[#132c2c] text-[#4ed8c4] border border-[#4ed8c4]/15";
      case "learning":
        return "bg-[#1a233a] text-[#8ea3ff] border border-[#8ea3ff]/15";
      case "new":
        return "bg-[#27272a]/50 text-zinc-400 border border-zinc-700/60";
      default:
        return "bg-zinc-850 text-zinc-500 border border-zinc-800";
    }
  };

  return (
    <Card className="bg-[#0c0c0e]/90 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
      <CardContent className="p-0">
        {filteredProblems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 font-sans p-6 text-center">
            <Library className="h-10 w-10 text-zinc-700 mb-3" />
            <div className="text-sm font-semibold text-zinc-400">No problems found</div>
            <div className="text-xs text-zinc-650 mt-1 max-w-[280px]">
              Try adjusting your search criteria or add new problems to get started.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-850 bg-zinc-950/40 text-[10px] font-bold text-zinc-500 tracking-wider font-sans uppercase">
                  <th className="py-4 px-5">
                    <button
                      onClick={() => toggleSort("num")}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <span>Number</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-5">Title</th>
                  <th className="py-4 px-5">
                    <button
                      onClick={() => toggleSort("difficulty")}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <span>Difficulty</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-5">Patterns</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">
                    <button
                      onClick={() => toggleSort("next_review")}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <span>Next Review</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60 text-sm font-sans text-zinc-350">
                {filteredProblems.map((p) => {
                  const status = getProblemStatus(p.id);
                  const nextReview = getNextReviewDate(p.id);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-zinc-950/30 transition-colors duration-150"
                    >
                      <td className="py-3.5 px-5 font-semibold font-mono text-zinc-500 text-xs">
                        #{p.leetcode_num}
                      </td>
                      
                      <td className="py-3.5 px-5 font-bold text-white max-w-[280px]">
                        <a
                          href={p.url || `https://leetcode.com/problems/${p.title_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 hover:text-[#cd5219] hover:underline transition-colors duration-150"
                        >
                          <span>{p.title}</span>
                          <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                        </a>
                      </td>

                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getDifficultyBadgeClass(
                            p.difficulty
                          )}`}
                        >
                          {p.difficulty}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                          {p.patterns?.slice(0, 3).map((pat) => (
                            <span
                              key={pat}
                              className="px-2 py-0.5 text-[11px] font-medium text-zinc-450 bg-zinc-900 border border-zinc-850 rounded-full"
                            >
                              {pat}
                            </span>
                          ))}
                          {p.patterns?.length > 3 && (
                            <span className="text-[10px] text-zinc-550 font-bold self-center">
                              +{p.patterns.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getStatusBadgeClass(
                            status
                          )}`}
                        >
                          {status === "mastered" && <Check className="h-3 w-3 shrink-0" />}
                          <span>{status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 font-medium text-zinc-450 text-xs">
                        {nextReview}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
