"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthModal } from "@/hooks/useAuthModal";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Target } from "lucide-react";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { onOpen } = useAuthModal();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  // Show nothing while checking auth (prevents flash)
  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="flex flex-col items-center gap-8 max-w-2xl text-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/pattern++.png"
              alt="Pattern++"
              width={200}
              height={200}
              priority
              style={{ width: "auto", height: "auto" }}
            />
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Master LeetCode{" "}
              <span className="text-primary">Patterns</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Smart interview prep powered by{" "}
              <span className="text-foreground font-medium">
                Spaced Repetition
              </span>{" "}
              never forget a pattern again.
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={onOpen}
            size="lg"
            className="gap-2 text-base font-semibold px-8 py-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Button>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium">Daily 3 Workout</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
              <Target className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium">Pattern Tracking</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border">
        Built with ❤️ for LeetCode grinders
      </footer>
    </div>
  );
}
