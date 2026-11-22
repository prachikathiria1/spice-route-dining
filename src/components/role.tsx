"use client";

import { ChefHat, Crown, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { SessionRole, ViewRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const RoleContext = createContext<SessionRole | null>(null);

export function RoleProvider({ role, children }: { role: SessionRole | null; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/** The signed-in role inside this restaurant ("super" = platform owner; null for customers). */
export const useStaffRole = () => useContext(RoleContext);

const BADGE: Record<ViewRole, { label: string; icon: typeof ShieldCheck; cls: string }> = {
  admin: { label: "Admin view", icon: ShieldCheck, cls: "bg-violet-600 text-white" },
  waiter: { label: "Waiter view", icon: ChefHat, cls: "bg-sky-600 text-white" },
  customer: { label: "Customer view", icon: Smartphone, cls: "bg-brand-600 text-white" },
  super: { label: "Super admin", icon: Crown, cls: "bg-amber-500 text-zinc-950" },
};

/** Pill shown in the top-right corner of every screen. */
export function RoleBadge({ view, className }: { view: ViewRole; className?: string }) {
  const b = BADGE[view];
  const Icon = b.icon;
  return (
    <span className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold tracking-wide shadow-sm", b.cls, className)} data-testid="role-badge">
      <Icon className="size-3.5" aria-hidden /> {b.label}
    </span>
  );
}

export function SignOutButton({ className, to = "/" }: { className?: string; to?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.replace(to);
        router.refresh();
      }}
      disabled={busy}
      className={cn("inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900", className)}
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut className="size-4" />
    </button>
  );
}
