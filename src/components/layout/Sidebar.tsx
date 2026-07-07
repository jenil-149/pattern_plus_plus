"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Library,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/providers/AuthProvider";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Problem Bank",
    href: "/problems",
    icon: Library,
  },
  {
    label: "Insights",
    href: "/analytics",
    icon: TrendingUp,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;

// ─── Desktop Sidebar ───────────────────────────────────────────────────────
function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { supabase } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-r border-sidebar-border bg-[#0a0a0a] transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <Image
            src="/images/pattern++.png"
            alt="Pattern++"
            width={150}
            height={150}
            className="shrink-0"
            style={{ width: "auto", height: "auto" }}
          />
        </Link>
      </div>

      <Separator className="bg-zinc-800/60" />

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                isActive
                  ? "bg-[#18181c] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors duration-200",
                  isActive
                    ? "text-white"
                    : "text-zinc-400 group-hover:text-white"
                )}
              />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {isActive && (
                <span className="absolute right-0 top-0 bottom-0 w-[3px] bg-white" />
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-sans">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto px-3 pb-4 space-y-2">
        <Separator className="bg-zinc-800/60 mb-2" />


        {/* Sign Out */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center rounded-lg p-2.5 text-zinc-400 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 w-full"
              >
                <LogOut className="h-5 w-5 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-sans">
              Sign Out
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 w-full"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all duration-200 w-full"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

// ─── Mobile Sidebar (Sheet Drawer) ──────────────────────────────────────────
function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { supabase } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.replace("/");
  };

  return (
    <>
      {/* Top Bar with Hamburger */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-zinc-800/85 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40 w-full">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/images/p++.png"
            alt="Pattern++"
            width={28}
            height={28}
            className=""
          />
          <span className="font-heading text-base font-bold text-primary tracking-tight">
            Pattern++
          </span>
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-[#0a0a0a] border-r border-zinc-800/80">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            {/* Sheet Header */}
            <div className="flex items-center gap-3 px-5 h-16">
              <Image
                src="/images/p++.png"
                alt="Pattern++"
                width={32}
                height={32}
                className="rounded"
              />
              <span className="font-heading text-lg font-bold text-primary tracking-tight">
                Pattern++
              </span>
            </div>

            <Separator className="bg-zinc-800/60" />

            {/* Nav Items */}
            <nav className="flex flex-col gap-1 px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                      isActive
                        ? "bg-[#18181c] text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-white" : "text-zinc-400"
                      )}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute right-0 top-0 bottom-0 w-[3px] bg-white" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Sign Out at bottom */}
            <div className="mt-auto absolute bottom-0 left-0 right-0 px-3 pb-6">
              <Separator className="bg-zinc-800/60 mb-3" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 w-full"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// ─── Combined Export ────────────────────────────────────────────────────────
export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
