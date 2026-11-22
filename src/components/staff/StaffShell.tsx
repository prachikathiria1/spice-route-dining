"use client";

import { ArrowLeft, ChefHat, ClipboardList, Download, LayoutDashboard, LayoutGrid, Menu as MenuIcon, QrCode, Settings, Type, UtensilsCrossed, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { RoleBadge, SignOutButton, useStaffRole } from "@/components/role";
import { Sheet } from "@/components/ui";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { chime } from "@/lib/alerts";
import { useBase, useStore } from "@/lib/data/store";
import { useStaffPrefs, useT, type TKey } from "@/lib/i18n";
import { openCalls } from "@/lib/selectors";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: TKey;
  icon: typeof ClipboardList;
}
const WAITER_NAV: NavItem[] = [
  { path: "/staff", label: "nav.orders", icon: ClipboardList },
  { path: "/floor", label: "nav.floor", icon: LayoutGrid },
  { path: "/kitchen", label: "nav.kitchen", icon: ChefHat },
];
const ADMIN_NAV: NavItem[] = [
  { path: "/admin", label: "nav.dashboard", icon: LayoutDashboard },
  { path: "/staff", label: "nav.orders", icon: ClipboardList },
  { path: "/floor", label: "nav.floor", icon: LayoutGrid },
  { path: "/admin/menu", label: "nav.menu", icon: UtensilsCrossed },
  { path: "/kitchen", label: "nav.kitchen", icon: ChefHat },
  { path: "/admin/tables", label: "nav.tables", icon: QrCode },
  { path: "/admin/settings", label: "nav.settings", icon: Settings },
];

export function ModeBadge({ className }: { className?: string }) {
  const { mode } = useStore();
  return (
    <span className={cn("hidden items-center gap-1.5 text-xs font-medium text-slate-500 xl:inline-flex", className)} title={mode === "supabase" ? "Live sync across all devices" : "Local demo: syncs between tabs in this browser only"}>
      <span className={cn("size-2 rounded-full", mode === "supabase" ? "bg-emerald-500" : "bg-amber-500")} />
      {mode === "supabase" ? "Live" : "Local demo"}
    </span>
  );
}

/** Plays a chime + vibrates when a new order arrives or a table calls for help. */
function useStaffAlerts(newOrders: number, helpCount: number) {
  const { prefs } = useStaffPrefs();
  const prev = useRef<{ o: number; h: number } | null>(null);
  useEffect(() => {
    if (prev.current && prefs.sound) {
      if (helpCount > prev.current.h) chime("help");
      else if (newOrders > prev.current.o) chime("order");
    }
    prev.current = { o: newOrders, h: helpCount };
  }, [newOrders, helpCount, prefs.sound]);
}

export function StaffShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: (ready: true) => ReactNode }) {
  const { state, error } = useStore();
  const base = useBase();
  const t = useT();
  const { prefs, setPrefs } = useStaffPrefs();
  const role = useStaffRole() ?? "waiter";
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const install = useInstallPrompt();
  const isAdmin = role === "admin" || role === "super";
  const nav = isAdmin ? ADMIN_NAV : WAITER_NAV;
  const helpCount = state ? openCalls(state).length : 0;
  const newOrders = state ? state.orders.filter((o) => o.status === "placed").length : 0;
  useStaffAlerts(newOrders, helpCount);

  // Big text: Tailwind sizes are rem-based, so scaling the root scales the whole UI.
  useEffect(() => {
    document.documentElement.style.fontSize = prefs.big ? "18px" : "";
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [prefs.big]);

  const isActive = (path: string) => (path === "/admin" ? pathname === `${base}/admin` : pathname.startsWith(base + path));
  const count = (path: string) => (path === "/staff" ? newOrders : path === "/floor" ? helpCount : 0);
  const mobileMain = nav.slice(0, 4);
  const mobileRest = nav.slice(4);

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-2 px-3 sm:px-6">
          {role === "super" && (
            <Link href="/super" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-slate-100" aria-label="All restaurants">
              <ArrowLeft className="size-5" />
            </Link>
          )}
          <Link href={isAdmin ? `${base}/admin` : `${base}/staff`} className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[13px] font-extrabold text-white">{(state?.settings[0]?.restaurantName ?? "R").slice(0, 2).toUpperCase()}</span>
            <span className="truncate text-[15px] font-extrabold tracking-tight">{state?.settings[0]?.restaurantName ?? ""}</span>
          </Link>
          <nav className="no-scrollbar ml-4 hidden h-full flex-1 items-stretch gap-1 overflow-x-auto md:flex" aria-label="Staff navigation">
            {nav.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                href={base + path}
                className={cn("flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm font-semibold transition-colors", isActive(path) ? "border-zinc-900 text-zinc-900" : "border-transparent text-slate-500 hover:text-zinc-900")}
                aria-current={isActive(path) ? "page" : undefined}
              >
                <Icon className="size-4" /> {t(label)}
                {count(path) > 0 && <Count n={count(path)} red={path === "/floor"} />}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <ModeBadge />
            <button
              onClick={() => setPrefs({ lang: prefs.lang === "hi" ? "en" : "hi" })}
              className="h-8 rounded-full border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:border-slate-400"
              aria-label={prefs.lang === "hi" ? "Switch to English" : "हिंदी में देखें"}
            >
              {prefs.lang === "hi" ? "EN" : "हिं"}
            </button>
            <RoleBadge view={role} className="max-sm:px-2.5 max-sm:text-[11px]" />
            <SignOutButton to={role === "super" ? "/super/login" : `${base}/login`} className="hidden md:inline-flex" />
          </div>
        </div>
      </header>
      {error && <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">{error}</div>}

      <main className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {state ? children(true) : <div className="py-20 text-center text-slate-400">…</div>}
      </main>

      {/* Phone tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" style={{ gridTemplateColumns: `repeat(${mobileMain.length + 1}, minmax(0, 1fr))` }} aria-label="Staff tabs">
        {mobileMain.map(({ path, label, icon: Icon }) => (
          <Link key={path} href={base + path} className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold", isActive(path) ? "text-zinc-900" : "text-slate-400")} aria-current={isActive(path) ? "page" : undefined}>
            <Icon className={cn("size-6", isActive(path) && "stroke-[2.5]")} />
            {t(label)}
            {count(path) > 0 && <span className="absolute right-[calc(50%-24px)] top-1.5"><Count n={count(path)} red={path === "/floor"} /></span>}
          </Link>
        ))}
        <button onClick={() => setMore(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold text-slate-400">
          <MenuIcon className="size-6" /> {t("nav.more")}
        </button>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title={t("nav.more")}>
        <div className="space-y-2 p-4">
          {mobileRest.map(({ path, label, icon: Icon }) => (
            <Link key={path} href={base + path} onClick={() => setMore(false)} className="flex h-14 items-center gap-3 rounded-2xl bg-slate-50 px-4 text-base font-bold">
              <Icon className="size-5" /> {t(label)}
            </Link>
          ))}
          <Toggle icon={Type} label={t("prefs.bigText")} on={prefs.big} onClick={() => setPrefs({ big: !prefs.big })} />
          <Toggle icon={prefs.sound ? Volume2 : VolumeX} label={t("sound")} on={prefs.sound} onClick={() => setPrefs({ sound: !prefs.sound })} />
          {install.canInstall && (
            <button onClick={install.prompt} className="flex h-14 w-full items-center gap-3 rounded-2xl bg-brand-600 px-4 text-base font-bold text-white">
              <Download className="size-5" /> {t("prefs.install")}
            </button>
          )}
          {install.iosHint && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">iPhone: tap <b>Share</b> → <b>Add to Home Screen</b> to install.</p>}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2">
            <span className="text-sm font-semibold text-slate-500">Sign out</span>
            <SignOutButton to={role === "super" ? "/super/login" : `${base}/login`} className="size-10" />
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function Count({ n, red }: { n: number; red?: boolean }) {
  return <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 text-white", red ? "bg-red-600" : "bg-brand-600")}>{n}</span>;
}

function Toggle({ icon: Icon, label, on, onClick }: { icon: typeof Type; label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} className="flex h-14 w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 text-base font-bold">
      <Icon className="size-5" /> {label}
      <span className={cn("ml-auto h-7 w-12 rounded-full p-0.5 transition", on ? "bg-emerald-600" : "bg-slate-300")}>
        <span className={cn("block size-6 rounded-full bg-white shadow transition", on && "translate-x-5")} />
      </span>
    </button>
  );
}
