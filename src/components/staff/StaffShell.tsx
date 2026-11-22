"use client";

import { ChefHat, ClipboardList, LayoutDashboard, LayoutGrid, QrCode, Settings, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { RoleBadge, SignOutButton, useStaffRole } from "@/components/role";
import { FullScreenLoader } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { openCalls } from "@/lib/selectors";
import { cn } from "@/lib/utils";

const WAITER_NAV = [
  { href: "/staff", label: "Orders", icon: ClipboardList },
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/floor", label: "Floor", icon: LayoutGrid },
];
const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  ...WAITER_NAV,
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/tables", label: "Tables & QR", icon: QrCode },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function ModeBadge({ className }: { className?: string }) {
  const { mode } = useStore();
  return (
    <span className={cn("hidden items-center gap-1.5 text-xs font-medium text-slate-500 lg:inline-flex", className)} title={mode === "supabase" ? "Live sync across all devices" : "Local demo: syncs between tabs in this browser only"}>
      <span className={cn("size-2 rounded-full", mode === "supabase" ? "bg-emerald-500" : "bg-amber-500")} />
      {mode === "supabase" ? "Live" : "Local demo"}
    </span>
  );
}

export function StaffShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: (ready: true) => ReactNode }) {
  const { state, error } = useStore();
  const role = useStaffRole() ?? "waiter";
  const pathname = usePathname();
  const nav = role === "admin" ? ADMIN_NAV : WAITER_NAV;
  const helpCount = state ? openCalls(state).length : 0;
  const newOrders = state ? state.orders.filter((o) => o.status === "placed").length : 0;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-4 sm:px-6">
          <Link href={role === "admin" ? "/admin" : "/staff"} className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-[13px] font-extrabold text-white">SR</span>
            <span className="hidden text-[15px] font-extrabold tracking-tight md:inline">{state?.settings[0]?.restaurantName ?? "Spice Route"}</span>
          </Link>
          <nav className="no-scrollbar -mb-px flex h-full flex-1 items-stretch gap-1 overflow-x-auto" aria-label="Staff navigation">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              const count = href === "/staff" ? newOrders : href === "/floor" ? helpCount : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm font-semibold transition-colors",
                    active ? "border-zinc-900 text-zinc-900" : "border-transparent text-slate-500 hover:text-zinc-900",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                  {count > 0 && <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 text-white", href === "/floor" ? "bg-red-600" : "bg-brand-600")}>{count}</span>}
                </Link>
              );
            })}
          </nav>
          <ModeBadge />
          <RoleBadge view={role} />
          <SignOutButton />
        </div>
      </header>
      {error && <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">{error}</div>}
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {state ? children(true) : <FullScreenLoader />}
      </main>
    </div>
  );
}
