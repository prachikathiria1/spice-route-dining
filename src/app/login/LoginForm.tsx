"use client";

import { ArrowLeft, ChefHat, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RoleBadge, useStaffRole } from "@/components/role";
import { HERO_IMAGE } from "@/lib/images";
import type { StaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LoginForm({ next, needAdmin, devHints }: { next?: string; needAdmin: boolean; devHints: boolean }) {
  const router = useRouter();
  const current = useStaffRole();
  const [role, setRole] = useState<StaffRole>(needAdmin ? "admin" : "waiter");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(needAdmin && current === "waiter" ? "That page needs Admin access." : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, pin }) });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Sign in failed");
        setPin("");
        return;
      }
      const dest = next && !(next.startsWith("/admin") && role !== "admin") ? next : role === "admin" ? "/admin" : "/staff";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const roles: { id: StaffRole; label: string; desc: string; icon: typeof ChefHat }[] = [
    { id: "waiter", label: "Waiter", desc: "Orders, kitchen & floor", icon: ChefHat },
    { id: "admin", label: "Admin", desc: "Everything + menu, sales, settings", icon: ShieldCheck },
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <div className="text-4xl font-extrabold tracking-tight">Spice Route</div>
          <p className="mt-2 max-w-md text-white/80">Run the floor, the kitchen and the menu from one place.</p>
        </div>
      </div>

      <div className="flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-zinc-900">
            <ArrowLeft className="size-4" /> Home
          </Link>
          <RoleBadge view={current ?? "customer"} />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <form onSubmit={submit} className="w-full max-w-sm space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Staff sign in</h1>
              <p className="mt-1 text-sm text-slate-500">Choose your role and enter your PIN.</p>
            </div>

            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Role">
              {roles.map(({ id, label, desc, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={role === id}
                  onClick={() => setRole(id)}
                  className={cn("rounded-2xl border-2 p-4 text-left transition", role === id ? "border-zinc-900 bg-zinc-50" : "border-slate-200 hover:border-slate-300")}
                >
                  <Icon className={cn("size-5", role === id ? "text-zinc-900" : "text-slate-400")} />
                  <div className="mt-2 font-bold">{label}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="pin" className="mb-1.5 block text-sm font-semibold">
                PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="••••"
                className="h-14 w-full rounded-2xl border border-slate-300 px-4 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100"
              />
            </div>

            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

            <button disabled={busy || pin.length < 4} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 font-bold text-white transition hover:bg-black disabled:bg-slate-300">
              {busy && <Loader2 className="size-4 animate-spin" />} Sign in as {role === "admin" ? "Admin" : "Waiter"}
            </button>

            {devHints && <p className="text-center text-xs text-slate-400">Local dev PINs: Admin 1234 · Waiter 0000</p>}
            <p className="text-center text-sm text-slate-500">
              Dining with us?{" "}
              <Link href="/" className="font-semibold text-brand-700 hover:underline">
                Pick your table
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
