"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserProfile {
  id: string;
  display_name: string | null;
  leetcode_username: string | null;
  avatar_url: string | null;
  email?: string;
}

/**
 * Fetches the user profile for the currently authenticated user.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user profile:", error);
    return {
      id: user.id,
      display_name: "",
      leetcode_username: "",
      avatar_url: "",
      email: user.email,
    };
  }

  return {
    id: user.id,
    display_name: data?.display_name || "",
    leetcode_username: data?.leetcode_username || "",
    avatar_url: data?.avatar_url || "",
    email: user.email,
  };
}

/**
 * Updates or creates the user profile with the given details.
 */
export async function updateUserProfile(
  displayName: string,
  leetcodeUsername: string
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const trimmedUsername = leetcodeUsername.trim();
  if (!trimmedUsername) {
    throw new Error("LeetCode username is required");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: displayName.trim() || null,
    leetcode_username: trimmedUsername,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error updating user profile:", error);
    throw new Error(error.message);
  }
}
