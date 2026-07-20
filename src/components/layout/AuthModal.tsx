"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthModal } from "@/hooks/useAuthModal";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AuthModal() {
  const { supabase, session } = useAuth();
  const { isOpen, onClose } = useAuthModal();

  useEffect(() => {
    if (session) {
      onClose();
    }
  }, [session, onClose]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] border border-neutral-800 bg-neutral-950 p-6 text-white shadow-xl sm:rounded-lg">
        <DialogHeader className="space-y-2 text-center">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Welcome to Pattern++
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-400">
            Sign in to start pattern recognition training.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Auth
            theme="dark"
            providers={["google"]}
            magicLink={true}
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "oklch(0.205 0 0)", // brand primary
                    brandAccent: "oklch(0.922 0 0)",
                    inputBackground: "transparent",
                    inputBorder: "oklch(1 0 0 / 10%)",
                    inputBorderFocus: "oklch(0.556 0 0)",
                    inputText: "#ffffff",
                    inputPlaceholder: "oklch(0.708 0 0)",
                  },
                },
              },
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
