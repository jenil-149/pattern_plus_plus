"use client";

import { useEffect, useRef } from "react";

interface HeatmapProps {
  cols?: number;
  rows?: number;
  activityData?: Record<string, number>;
}

// Helper to format Date object into local YYYY-MM-DD string
function getLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Deterministic pattern helper for mock data if activityData is not provided
const getActivityLevelMock = (col: number, row: number) => {
  const seed = (col * 7 + row) % 13;
  if (col >= 27) {
    if (seed % 5 === 0) return 3; // High (Yellow)
    if (seed % 3 === 0) return 2; // Medium (Orange)
    if (seed % 2 === 0) return 1; // Low (Dark Orange)
    return 2;
  } else {
    if (seed % 9 === 0) return 2;
    if (seed % 5 === 0) return 1;
    if (seed % 4 === 0) return 0;
    if (seed % 2 === 0) return 0;
    return 0;
  }
};

export function Heatmap({ cols = 40, rows = 7, activityData }: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* Heatmap Grid Container */}
      <div className="relative">
        <div
          ref={containerRef}
          className="grid grid-rows-7 grid-flow-col gap-1 md:gap-[5px] overflow-x-auto pb-2 max-w-full scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        >
          {Array.from({ length: cols }).map((_, colIdx) =>
            Array.from({ length: rows }).map((_, rowIdx) => {
              let level = 0;
              let tooltipText = "";

              if (activityData) {
                // Calculate calendar date for this cell (bottom-right is today)
                const daysAgo = (cols - 1 - colIdx) * 7 + (rows - 1 - rowIdx);
                const cellDate = new Date();
                cellDate.setDate(cellDate.getDate() - daysAgo);
                const dateStr = getLocalDateStr(cellDate);

                const count = activityData[dateStr] || 0;

                // Map count to level (0 to 3)
                if (count === 1) level = 1;
                else if (count === 2) level = 2;
                else if (count >= 3) level = 3;

                // Tooltip date format
                const formattedDate = cellDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                tooltipText = `${count} problem${count === 1 ? "" : "s"} solved on ${formattedDate}`;
              } else {
                level = getActivityLevelMock(colIdx, rowIdx);
                tooltipText = `Day: ${colIdx * 7 + rowIdx + 1}, Level: ${level}`;
              }

              let bgClass = "bg-[#181311]"; // level 0
              if (level === 1) bgClass = "bg-[#4d2516]"; // level 1
              if (level === 2) bgClass = "bg-[#cd5219]"; // level 2
              if (level === 3) bgClass = "bg-[#fcd34d]"; // level 3 (most)

              return (
                <div
                  key={`${colIdx}-${rowIdx}`}
                  className={`w-[12px] h-[12px] md:w-[13px] md:h-[13px] rounded-[2px] ${bgClass} transition-all duration-300 hover:scale-125 cursor-pointer`}
                  title={tooltipText}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
