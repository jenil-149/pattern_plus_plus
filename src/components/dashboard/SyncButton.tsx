"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncLeetCodeSubmissions } from "@/actions/leetcode";
import { toast } from "sonner";

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    toast.info("Syncing submissions from LeetCode...");

    try {
      const result = await syncLeetCodeSubmissions();

      if (result.success) {
        if (result.count > 0) {
          toast.success(result.message);
          // Refresh the page data (stats, heatmap, etc.)
          router.refresh();
        } else {
          toast.info(result.message);
        }
      } else {
        if (result.message.includes("Settings")) {
          // Provide an action button to redirect to settings
          toast.error(result.message, {
            duration: 8000,
            action: {
              label: "Settings",
              onClick: () => router.push("/settings"),
            },
          });
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync with LeetCode. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className="gap-2 border-zinc-800 bg-[#09090b] text-zinc-300 hover:text-white hover:bg-zinc-900 hover:border-zinc-700 cursor-pointer text-xs font-semibold h-9 rounded-lg"
    >
      <RotateCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-[#cd5219]" : ""}`} />
      <span>{isSyncing ? "Syncing..." : "Sync LeetCode"}</span>
    </Button>
  );
}
