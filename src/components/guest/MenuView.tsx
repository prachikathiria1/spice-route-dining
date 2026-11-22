"use client";

import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SpiceMeter, VegMark } from "@/components/ui";
import { orderCategories, type Category, type MenuItem } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { DishImage, hasDishImage } from "./DishImage";

const fromPrice = (m: MenuItem) => (m.sizes?.length ? Math.min(...m.sizes.map((s) => s.price)) : m.price);

export function MenuView({ menu, tableLabel, restaurantName, hero, onOpen }: { menu: MenuItem[]; tableLabel: string; restaurantName: string; hero?: string | null; onOpen: (item: MenuItem) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [vegOnly, setVegOnly] = useState(false);

  const sorted = useMemo(() => [...menu].sort((a, b) => a.sortOrder - b.sortOrder), [menu]);
  const allVeg = menu.length > 0 && menu.every((m) => m.veg);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted
      .filter((m) => (category === "All" || m.category === category) && (!vegOnly || m.veg))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  }, [sorted, query, category, vegOnly]);

  const picks = sorted.filter((m) => m.popular && m.available && hasDishImage(m)).slice(0, 8);
  const usedCategories = useMemo(() => orderCategories(menu), [menu]);
  const groups = usedCategories.map((c) => ({ c, items: filtered.filter((m) => m.category === c) })).filter((g) => g.items.length);
  const browsing = !query && category === "All" && !vegOnly;

  return (
    <div>
      {/* Hero */}
      <div className="px-4 pt-4">
        <div className="relative h-40 overflow-hidden rounded-3xl">
          {hero ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero} alt="" className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900" />
          )}
          <div className="relative flex h-full flex-col justify-end p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{tableLabel}</div>
            <div className="text-2xl font-extrabold leading-tight tracking-tight">Welcome to {restaurantName}</div>
            <div className="text-sm text-white/80">Order right from your phone</div>
          </div>
        </div>
      </div>

      {/* Search + categories */}
      <div className="sticky top-14 z-20 space-y-3 bg-[#f6f5f3]/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a dish"
            className="h-12 w-full rounded-2xl border-0 bg-white pl-11 pr-10 text-[15px] shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-zinc-900"
            aria-label="Search the menu"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Menu categories">
          {allVeg ? (
            <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-sm font-bold text-white">
              <VegMark veg className="border-white [&>span]:bg-white" /> 100% Veg
            </span>
          ) : (
            <button
              onClick={() => setVegOnly((v) => !v)}
              aria-pressed={vegOnly}
              className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition", vegOnly ? "bg-emerald-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200")}
            >
              <VegMark veg className={vegOnly ? "border-white [&>span]:bg-white" : ""} /> Veg
            </button>
          )}
          {(["All", ...usedCategories] as const).map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition", category === c ? "bg-zinc-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Chef's picks */}
      {browsing && picks.length > 0 && (
        <section className="pb-2 pt-2">
          <h2 className="px-4 text-lg font-extrabold tracking-tight">Chef&apos;s picks</h2>
          <div className="no-scrollbar mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {picks.map((m) => (
              <button key={m.id} onClick={() => onOpen(m)} className="group w-44 shrink-0 snap-start text-left">
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-slate-200">
                  <DishImage item={m} className="size-full transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <div className="font-bold leading-tight">{m.name}</div>
                    <div className="mt-0.5 text-sm text-white/85">{formatINR(fromPrice(m))}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-8 px-4 pb-6 pt-4">
        {groups.length === 0 && <p className="py-16 text-center text-slate-500">No dishes match “{query}”.</p>}
        {groups.map(({ c, items }) => (
          <section key={c}>
            <h2 className="mb-1 text-lg font-extrabold tracking-tight">{c}</h2>
            <div className="divide-y divide-slate-200/80">
              {items.map((m) => (
                <DishRow key={m.id} item={m} onOpen={() => onOpen(m)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function DishRow({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  const photo = hasDishImage(item);
  return (
    <button onClick={onOpen} className="flex w-full items-start gap-4 py-4 text-left" aria-label={`${item.name}, ${formatINR(fromPrice(item))}${item.available ? "" : ", sold out"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <VegMark veg={item.veg} />
          {item.popular && <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">Bestseller</span>}
        </div>
        <div className={cn("mt-1 text-[16px] font-bold leading-snug", !item.available && "text-slate-400")}>{item.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[15px] font-semibold">
          {item.sizes?.length ? <span className="text-xs font-medium text-slate-500">from</span> : null}
          {formatINR(fromPrice(item))}
          {item.spiceLevel > 0 && <SpiceMeter level={item.spiceLevel} />}
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
      </div>
      <div className="relative w-28 shrink-0 pb-4">
        {photo ? (
          <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
            <DishImage item={item} className="size-full" />
          </div>
        ) : null}
        <span
          className={cn(
            "flex h-9 items-center justify-center gap-1 rounded-xl text-sm font-extrabold shadow-md",
            photo ? "absolute inset-x-3 bottom-0" : "mt-6",
            item.available ? "bg-white text-emerald-700 ring-1 ring-slate-200" : "bg-slate-100 text-slate-400",
          )}
          aria-hidden
        >
          {item.available ? (
            <>
              ADD <Plus className="size-4" />
            </>
          ) : (
            "Sold out"
          )}
        </span>
      </div>
    </button>
  );
}
