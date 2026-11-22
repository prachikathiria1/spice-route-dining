"use client";

import { ArrowLeft, ChefHat, Delete, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RoleBadge, useStaffRole } from "@/components/role";
import { useStore } from "@/lib/data/store";
import { useStaffPrefs, useT } from "@/lib/i18n";
import type { StaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LoginForm({ slug, next, needAdmin, devHints }: { slug: string; next?: string; needAdmin: boolean; devHints: boolean }) {
  const router = useRouter();
  const current = useStaffRole();
  const { state } = useStore();
  const t = useT();
  const { prefs, setPrefs } = useStaffPrefs();
  const [role, setRole] = useState<StaffRole>(needAdmin ? "admin" : "waiter");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/r/${slug}`;

  async function submit(p = pin) {
    if (p.length < 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rid: slug, role, pin: p }) });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(res.status === 401 ? t("login.wrong") : data.error ?? "Error");
        setPin("");
        return;
      }
      const dest = next && !(next.startsWith(`${base}/admin`) && role !== "admin") ? next : role === "admin" ? `${base}/admin` : `${base}/staff`;
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const press = (d: string) => {
    if (busy) return;
    const p = (pin + d).slice(0, 8);
    setPin(p);
    setError(null);
  };

  const roles = [
    { id: "waiter" as const, label: t("login.waiter"), desc: t("login.waiterDesc"), icon: ChefHat, tone: "bg-sky-600" },
    { id: "admin" as const, label: t("login.admin"), desc: t("login.adminDesc"), icon: ShieldCheck, tone: "bg-violet-600" },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="flex items-center justify-between gap-2 p-4">
        <Link href={base} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
          <ArrowLeft className="size-4" /> {state?.settings[0]?.restaurantName ?? ""}
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setPrefs({ lang: prefs.lang === "hi" ? "en" : "hi" })} className="h-8 rounded-full border border-slate-200 px-3 text-xs font-bold">
            {prefs.lang === "hi" ? "English" : "हिंदी"}
          </button>
          <RoleBadge view={current ?? "customer"} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("login.title")}</h1>
        <p className="mt-1 text-slate-500">{t("login.choose")}</p>

        <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup">
          {roles.map(({ id, label, desc, icon: Icon, tone }) => (
            <button key={id} type="button" role="radio" aria-checked={role === id} onClick={() => setRole(id)} className={cn("rounded-3xl border-2 p-4 text-left transition", role === id ? "border-zinc-900 bg-zinc-50" : "border-slate-200")}>
              <span className={cn("flex size-11 items-center justify-center rounded-2xl text-white", tone)}>
                <Icon className="size-6" />
              </span>
              <div className="mt-2 text-lg font-extrabold">{label}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </button>
          ))}
        </div>

        {/* PIN dots */}
        <div className="mt-6 flex justify-center gap-3" aria-label="PIN" aria-live="polite">
          {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
            <span key={i} className={cn("size-4 rounded-full", i < pin.length ? "bg-zinc-900" : "bg-slate-200")} />
          ))}
        </div>
        <input
          className="sr-only"
          aria-label="PIN"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center font-semibold text-red-700">{error}</p>}

        {/* Big keypad: easier than a phone keyboard for many staff */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onClick={() => press(d)}>{d}</Key>
          ))}
          <Key onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete">
            <Delete className="size-6" />
          </Key>
          <Key onClick={() => press("0")}>0</Key>
          <button onClick={() => submit()} disabled={pin.length < 4 || busy} className="flex h-16 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-extrabold text-white disabled:bg-slate-200 disabled:text-slate-400">
            {busy ? <Loader2 className="size-6 animate-spin" /> : "OK"}
          </button>
        </div>
        {devHints && <p className="mt-4 text-center text-xs text-slate-400">Dev: demo PINs are Manager 1234 · Waiter 0000 unless set by the super admin</p>}
      </div>
    </div>
  );
}

function Key({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} type="button" className="flex h-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-bold active:bg-slate-200">
      {children}
    </button>
  );
}
