"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfile, updateUserProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";

interface ProfileFormProps {
  profile: UserProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [leetcodeUsername, setLeetcodeUsername] = useState(profile.leetcode_username || "");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUsername = leetcodeUsername.trim();
    if (!trimmedUsername) {
      toast.error("LeetCode username is required.");
      return;
    }

    setIsLoading(true);
    try {
      await updateUserProfile(displayName, trimmedUsername);
      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to update profile.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <CardContent className="space-y-5 pt-6">
        {/* Email Field (Read-only) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 tracking-wider uppercase font-sans">
            Email Address
          </label>
          <input
            type="email"
            value={profile.email || ""}
            disabled
            className="flex h-10 w-full rounded-lg border border-zinc-900 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed select-none focus:outline-none font-sans"
          />
          <p className="text-[11px] text-zinc-650 font-sans">
            Your login email is managed by your authentication provider.
          </p>
        </div>

        {/* Display Name Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 tracking-wider uppercase font-sans">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="e.g. Code Ninja"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-800 bg-[#09090b] pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors font-sans"
            />
          </div>
        </div>

        {/* LeetCode Username Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 tracking-wider uppercase font-sans flex items-center gap-1.5">
            LeetCode Username <span className="text-[#cd5219]">*</span>
          </label>
          <div className="relative">
            {/* LeetCode Icon Mock using double plus or generic terminal icon */}
            <span className="absolute left-3 top-[10px] text-xs font-bold font-mono text-[#cd5219] select-none">
              LC
            </span>
            <input
              type="text"
              placeholder="Your LeetCode handle"
              value={leetcodeUsername}
              onChange={(e) => setLeetcodeUsername(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-800 bg-[#09090b] pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#cd5219] focus:ring-1 focus:ring-[#cd5219] transition-colors font-sans"
              required
            />
          </div>
          <p className="text-[11px] text-zinc-550 font-sans leading-relaxed">
            Required to fetch your solved problems count and submissions history from LeetCode.
          </p>
        </div>
      </CardContent>

      <CardFooter className="border-t border-zinc-850/60 bg-zinc-950/20 px-6 py-4 flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          className="gap-2 bg-[#cd5219] hover:bg-[#b04313] text-white font-semibold cursor-pointer shadow-lg shadow-[#cd5219]/10"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{isLoading ? "Saving..." : "Save Changes"}</span>
        </Button>
      </CardFooter>
    </form>
  );
}
