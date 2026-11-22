"use client";

import { ArrowRight, LogIn } from "lucide-react";
import Link from "next/link";
import { RoleBadge, useStaffRole } from "@/components/role";
import { useStore } from "@/lib/data/store";
import { HERO_IMAGE } from "@/lib/images";
import { sortedTables } from "@/lib/selectors";
import { tableNumber } from "@/lib/utils";

export default function Home() {
  const { state } = useStore();
  const role = useStaffRole();
  const settings = state?.settings[0];

  return (
    <div className="min-h-dvh bg-white">
      <section className="relative isolate h-[58dvh] min-h-[380px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_IMAGE} alt="A spread of tandoori chicken, naan and chutneys" className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/10 to-black/80" />
        <div className="mx-auto flex h-full max-w-5xl flex-col px-5 pb-8 pt-4">
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/95 text-sm font-extrabold text-zinc-900">SR</span>
            <RoleBadge view={role ?? "customer"} />
          </div>
          <div className="mt-auto text-white">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">{settings?.restaurantName ?? "Spice Route"}</h1>
            <p className="mt-2 text-lg text-white/85">{settings?.tagline ?? "North Indian kitchen & tandoor"}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-5 py-10">
        {role ? (
          <Link href={role === "admin" ? "/admin" : "/staff"} className="mb-10 flex items-center justify-between rounded-2xl bg-zinc-900 px-5 py-4 font-bold text-white">
            Go to the {role === "admin" ? "admin dashboard" : "waiter console"} <ArrowRight className="size-5" />
          </Link>
        ) : null}

        <h2 className="text-xl font-extrabold tracking-tight">Order from your table</h2>
        <p className="mt-1 text-sm text-slate-500">Scan the QR code on your table, or pick it below.</p>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {(state ? sortedTables(state) : Array.from({ length: 6 }, (_, i) => ({ id: `T${i + 1}` }))).map((t) => (
            <Link
              key={t.id}
              href={`/t/${tableNumber(t.id)}`}
              className="group flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-zinc-900 hover:shadow-lg"
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Table</span>
              <span className="text-3xl font-extrabold">{tableNumber(t.id)}</span>
            </Link>
          ))}
        </div>

        {!role && (
          <div className="mt-14 flex items-center justify-center">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-zinc-900 hover:text-zinc-900">
              <LogIn className="size-4" /> Staff sign in
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
