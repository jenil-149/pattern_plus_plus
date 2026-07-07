import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/profile";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function SettingsPage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/");
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto px-1">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-white font-heading">Settings</h1>
        <p className="text-zinc-400 mt-1.5 text-sm md:text-base font-sans">
          Manage your LeetCode connection and profile settings.
        </p>
      </div>

      <Card className="bg-[#0c0c0e]/95 border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl">
        <ProfileForm profile={profile} />
      </Card>
    </div>
  );
}
