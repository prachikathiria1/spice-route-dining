"use client";

import { ExternalLink, Loader2, Plus, Settings2, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listRestaurants } from "@/lib/data/platform";
import { supabaseEnv } from "@/lib/data/store";
import { THEMES } from "@/lib/themes";
import type { Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SuperHome() {
  const [list, setList] = useState<Settings[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRestaurants().then(setList).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Restaurants</h1>
          <p className="text-sm text-slate-500">{supabaseEnv() ? "Live on Supabase" : "Local demo mode: restaurants are stored in this browser only"}</p>
        </div>
        <Link href="/super/new" className="flex h-12 items-center gap-2 rounded-2xl bg-zinc-900 px-5 font-bold text-white">
          <Plus className="size-5" /> Add restaurant
        </Link>
      </div>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!list && !error && (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
      {list?.length === 0 && (
        <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-slate-200">
          <Store className="mx-auto size-10 text-slate-300" />
          <p className="mt-2 font-bold">No restaurants yet</p>
          <p className="text-sm text-slate-500">Add your first one. It takes about 3 minutes with a menu PDF.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {list?.map((r) => {
          const theme = THEMES[r.theme ?? "saffron"] ?? THEMES.saffron;
          return (
            <div key={r.slug} className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
              <div className="h-16" style={{ background: `linear-gradient(135deg, ${theme.palette[5]}, ${theme.palette[8]})` }} />
              <div className="-mt-8 space-y-3 p-4">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-lg font-extrabold shadow-md" style={{ color: theme.palette[7] }}>
                  {r.restaurantName.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-extrabold">{r.restaurantName}</h2>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", r.active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-800")}>{r.active === false ? "Paused" : "Live"}</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    /r/{r.slug}
                    {r.cuisine ? ` · ${r.cuisine}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/super/r/${r.slug}`} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 text-sm font-bold text-white">
                    <Settings2 className="size-4" /> Manage
                  </Link>
                  <Link href={`/r/${r.slug}`} target="_blank" className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 text-sm font-bold">
                    <ExternalLink className="size-4" /> Customer page
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
