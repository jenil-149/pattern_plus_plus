"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addProblemBySlug } from "@/actions/problems";
import { toast } from "sonner";

interface AddProblemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddProblemDialog({ isOpen, onOpenChange, onSuccess }: AddProblemDialogProps) {
  const [slugInput, setSlugInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slugInput.trim()) {
      toast.error("Please enter a valid LeetCode slug or URL.");
      return;
    }

    setIsAdding(true);
    try {
      await addProblemBySlug(slugInput);
      toast.success("Problem successfully added to Bank!");
      setSlugInput("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add problem.";
      toast.error(msg);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#cd5219] hover:bg-[#b04313] text-white font-semibold cursor-pointer shadow-lg shadow-[#cd5219]/10 h-10 px-5 rounded-lg">
          <Plus className="h-4.5 w-4.5" />
          <span>Add Problem</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[450px] border border-zinc-800 bg-[#0c0c0e]/95 p-6 text-white shadow-2xl sm:rounded-xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-bold tracking-tight">
            Add Problem from LeetCode
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400 font-sans">
            Paste the LeetCode question URL or title slug. We will automatically fetch all details from LeetCode.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddProblem} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 tracking-wider uppercase font-sans">
              LeetCode URL or Slug
            </label>
            <input
              type="text"
              placeholder="e.g. climbing-stairs or https://leetcode.com/..."
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-800 bg-[#070708] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#cd5219] focus:ring-1 focus:ring-[#cd5219] transition-colors font-sans"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-white font-sans cursor-pointer h-9 px-4 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAdding}
              className="gap-2 bg-[#cd5219] hover:bg-[#b04313] text-white font-semibold cursor-pointer h-9 px-4 rounded-lg shadow-md"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>{isAdding ? "Adding..." : "Add to Bank"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
