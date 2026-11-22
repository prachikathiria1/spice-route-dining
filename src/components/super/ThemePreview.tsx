"use client";

import { Plus } from "lucide-react";
import { DishImage, hasDishImage } from "@/components/guest/DishImage";
import { VegMark } from "@/components/ui";
import { themeVars } from "@/lib/themes";
import type { MenuItem, ThemeId } from "@/lib/types";
import { formatINR } from "@/lib/utils";

/** A small phone mock-up of how the customer menu will look. */
export function ThemePreview({ name, tagline, theme, items }: { name: string; tagline?: string; theme: ThemeId; items: MenuItem[] }) {
  const sample = [...items].sort((a, b) => Number(hasDishImage(b)) - Number(hasDishImage(a))).slice(0, 4);
  return (
    <div style={themeVars(theme)} className="mx-auto w-full max-w-[290px] overflow-hidden rounded-[2.2rem] border-[6px] border-zinc-900 bg-[#f6f5f3] shadow-2xl">
      <div className="relative bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900 px-4 pb-6 pt-5 text-white">
        <span className="absolute right-6 top-6 size-3 animate-float rounded-full bg-white/25" />
        <span className="absolute left-10 top-14 size-2 animate-float rounded-full bg-white/25" style={{ animationDelay: "1s" }} />
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Table 3</div>
        <div className="text-xl font-extrabold leading-tight">{name || "Your restaurant"}</div>
        {tagline && <div className="text-xs text-white/80">{tagline}</div>}
      </div>
      <div className="space-y-0 divide-y divide-slate-200 px-3 py-2">
        {sample.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Menu items will appear here</p>}
        {sample.map((m) => (
          <div key={m.id} className="flex items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <VegMark veg={m.veg} className="size-3" />
              <div className="truncate text-[13px] font-bold">{m.name}</div>
              <div className="text-[12px] font-semibold">{formatINR(m.sizes?.length ? Math.min(...m.sizes.map((s) => s.price)) : m.price)}</div>
            </div>
            <div className="relative w-14 shrink-0">
              {hasDishImage(m) && <DishImage item={m} className="aspect-square w-14 rounded-xl" />}
              <span className="mt-1 flex h-6 items-center justify-center gap-0.5 rounded-lg bg-white text-[10px] font-extrabold text-brand-700 ring-1 ring-slate-200">
                ADD <Plus className="size-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="m-3 rounded-xl bg-brand-600 py-2 text-center text-xs font-bold text-white">View cart</div>
    </div>
  );
}
