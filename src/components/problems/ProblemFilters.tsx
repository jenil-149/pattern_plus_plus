"use client";

import { Search, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ProblemFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (difficulty: string) => void;
  selectedPattern: string;
  setSelectedPattern: (pattern: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  availablePatterns: string[];
}

export function ProblemFilters({
  searchQuery,
  setSearchQuery,
  selectedDifficulty,
  setSelectedDifficulty,
  selectedPattern,
  setSelectedPattern,
  selectedStatus,
  setSelectedStatus,
  availablePatterns,
}: ProblemFiltersProps) {
  return (
    <Card className="bg-[#0c0c0e]/90 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
      <CardContent className="p-4 md:p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search title or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-850 bg-[#070708] pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors font-sans"
            />
          </div>

          <div className="relative">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-850 bg-[#070708] px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700 cursor-pointer appearance-none font-sans"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-850 bg-[#070708] px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700 cursor-pointer appearance-none font-sans"
            >
              <option value="all">All Patterns</option>
              {availablePatterns.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-850 bg-[#070708] px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700 cursor-pointer appearance-none font-sans"
            >
              <option value="all">All Statuses</option>
              <option value="new">New (Unstarted)</option>
              <option value="learning">Learning</option>
              <option value="mastered">Mastered</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
