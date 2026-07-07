"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarSync } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddProblemDialog } from "./AddProblemDialog";
import { ProblemFilters } from "./ProblemFilters";
import { ProblemTable, Problem } from "./ProblemTable";
import { rebalanceReviewDates } from "@/actions/problems";
import { toast } from "sonner";

interface ProgressRecord {
  problem_id: string;
  status: string;
  next_review_date: string;
}

interface ProblemBankClientProps {
  problems: Problem[];
  progress: ProgressRecord[];
}

const PATTERNS = [
  "Array",
  "Hash Table",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Stack",
  "Linked List",
  "Tree",
  "Depth-First Search",
  "Breadth-First Search",
  "Graph",
  "Heap (Priority Queue)",
  "Dynamic Programming",
  "Backtracking",
  "Trie",
  "Intervals",
  "Greedy",
  "Bit Manipulation",
] as const;

export function ProblemBankClient({ problems, progress }: ProblemBankClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedPattern, setSelectedPattern] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"num" | "difficulty" | "next_review">("next_review");
  const [sortAsc, setSortAsc] = useState(true);

  const availablePatterns = Array.from(
    new Set([
      ...PATTERNS,
      ...problems.flatMap((p) => p.patterns || []),
    ])
  ).sort();

  const progressMap = new Map<string, ProgressRecord>(
    progress.map((p) => [p.problem_id, p])
  );

  const getProblemStatus = (problemId: string): string => {
    return progressMap.get(problemId)?.status || "new";
  };

  const getNextReviewDate = (problemId: string): string => {
    const record = progressMap.get(problemId);
    if (!record) return "—";
    const problem = problems.find((p) => p.id === problemId);
    if (
      record.status === "mastered" ||
      record.next_review_date === "9999-12-31" ||
      problem?.difficulty === "Easy"
    ) {
      return "—";
    }
    return record.next_review_date;
  };

  const handleRebalance = async () => {
    setIsRebalancing(true);
    try {
      const result = await rebalanceReviewDates();
      if (result.success) {
        toast.success(result.message);
        if (result.moved > 0) router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to rebalance review dates.");
    } finally {
      setIsRebalancing(false);
    }
  };

  const toggleSort = (type: "num" | "difficulty" | "next_review") => {
    if (sortBy === type) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(type);
      setSortAsc(true);
    }
  };

  const filteredProblems = problems
    .filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.leetcode_num).includes(searchQuery);

      const matchDifficulty =
        selectedDifficulty === "all" || p.difficulty === selectedDifficulty;

      const matchPattern =
        selectedPattern === "all" || p.patterns?.includes(selectedPattern);

      const status = getProblemStatus(p.id);
      const matchStatus =
        selectedStatus === "all" || status === selectedStatus;

      return matchSearch && matchDifficulty && matchPattern && matchStatus;
    })
    .sort((a, b) => {
      const multiplier = sortAsc ? 1 : -1;

      if (sortBy === "num") {
        return (a.leetcode_num - b.leetcode_num) * multiplier;
      }

      if (sortBy === "difficulty") {
        const diffWeight: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
        const weightA = diffWeight[a.difficulty] || 0;
        const weightB = diffWeight[b.difficulty] || 0;
        return (weightA - weightB) * multiplier;
      }

      if (sortBy === "next_review") {
        const recordA = progressMap.get(a.id);
        const recordB = progressMap.get(b.id);
        const isMasteredA = recordA?.status === "mastered" || recordA?.next_review_date === "9999-12-31" || a.difficulty === "Easy";
        const isMasteredB = recordB?.status === "mastered" || recordB?.next_review_date === "9999-12-31" || b.difficulty === "Easy";

        const dateA = isMasteredA ? "9999-12-31" : (recordA?.next_review_date || "9999-99-99");
        const dateB = isMasteredB ? "9999-12-31" : (recordB?.next_review_date || "9999-99-99");
        return dateA.localeCompare(dateB) * multiplier;
      }

      return 0;
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white font-heading">Problem Bank</h1>
          <p className="text-zinc-400 mt-1.5 text-sm md:text-base font-sans">
            Manage, filter, and review your LeetCode problem collection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleRebalance}
            disabled={isRebalancing}
            variant="outline"
            className="gap-2 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900 text-zinc-300 hover:text-white font-semibold cursor-pointer h-10 px-4 rounded-lg transition-colors"
          >
            {isRebalancing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarSync className="h-4 w-4" />
            )}
            <span>{isRebalancing ? "Rebalancing..." : "Rebalance Reviews"}</span>
          </Button>

          <AddProblemDialog
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            onSuccess={() => router.refresh()}
          />
        </div>
      </div>

      <ProblemFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDifficulty={selectedDifficulty}
        setSelectedDifficulty={setSelectedDifficulty}
        selectedPattern={selectedPattern}
        setSelectedPattern={setSelectedPattern}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        availablePatterns={availablePatterns}
      />

      <ProblemTable
        filteredProblems={filteredProblems}
        sortBy={sortBy}
        sortAsc={sortAsc}
        toggleSort={toggleSort}
        getProblemStatus={getProblemStatus}
        getNextReviewDate={getNextReviewDate}
      />
    </div>
  );
}
