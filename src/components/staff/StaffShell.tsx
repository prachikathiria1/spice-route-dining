"use client";

import { BarChart3, ChefHat, ClipboardList, Database, LayoutGrid, QrCode, UtensilsCrossed, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FullScreenLoader } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { openCalls } from "@/lib/selectors";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/staff", label: "Orders", icon: ClipboardList },
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/floor", label: "Floor", icon: LayoutGrid },
  { href: "/qr", label: "QR codes", icon: QrCode },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/sales", label: "Sales", icon: BarChart3 },
];

export function ModeBadge({ className }: { className?: string }) {
  const { mode } = useStore();
  return mode === "supabase" ? (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800", className)}>
      <Database className="size-3" /> Supabase live
    </span>
  ) : (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900", className)}
      title="Local demo mode: data syncs across tabs in this browser only. Add Supabase env vars for cross-device sync."
    >
      <WifiOff className="size-3" /> Local demo
    </span>
  );
}

export function StaffShell({ title, actions, children }: { title: string; actions?: ReactNode; children: (ready: true) => ReactNode }) {
  const { state, error } = useStore();
  const pathname = usePathname();
  const helpCount = state ? openCalls(state).length : 0;
  const newOrders = state ? state.orders.filter((o) => o.status === "placed").length : 0;

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-3 py-2 sm:px-5">
          <Link href="/" className="mr-2 flex items-center gap-2 font-black tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600">SR</span>
            <span className="hidden lg:inline">{state?.settings[0]?.restaurantName ?? "Spice Route"}</span>
          </Link>
          <nav className="no-scrollbar flex flex-1 gap-1 overflow-x-auto">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              const count = href === "/staff" ? newOrders : href === "/floor" ? helpCount : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active ? "bg-white text-slate-900" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                  {count > 0 && (
                    <span className={cn("ml-0.5 min-w-5 rounded-full px-1.5 text-center text-xs font-bold text-white", href === "/floor" ? "bg-red-600" : "bg-brand-600")}>{count}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          <ModeBadge className="hidden shrink-0 md:inline-flex" />
        </div>
      </header>
      {error && <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">{error}</div>}
      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          {actions}
        </div>
        {state ? children(true) : <FullScreenLoader />}
      </main>
    </div>
  );
}
