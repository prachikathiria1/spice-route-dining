"use client";

import { Plus, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Badge, SpiceMeter, VegMark } from "@/components/ui";
import { CATEGORIES, type Category, type MenuItem } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

export function MenuView({ menu, onOpen }: { menu: MenuItem[]; onOpen: (item: MenuItem) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [vegOnly, setVegOnly] = useState(false);
  const listTop = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...menu]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((m) => (category === "All" || m.category === category) && (!vegOnly || m.veg))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.allergens.some((a) => a.toLowerCase().includes(q)));
  }, [menu, query, category, vegOnly]);

  const groups = CATEGORIES.map((c) => ({ c, items: filtered.filter((m) => m.category === c) })).filter((g) => g.items.length);
  const usedCategories = CATEGORIES.filter((c) => menu.some((m) => m.category === c));

  return (
    <div>
      <div className="sticky top-[64px] z-20 space-y-2 border-b border-slate-200 bg-slate-50/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes, e.g. paneer, lassi"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            aria-label="Search the menu"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Menu categories">
          <button
            onClick={() => setVegOnly((v) => !v)}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold", vegOnly ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700")}
            aria-pressed={vegOnly}
          >
            <VegMark veg className={vegOnly ? "border-white [&>span]:bg-white" : ""} /> Veg
          </button>
          {(["All", ...usedCategories] as const).map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => {
                setCategory(c);
                listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                category === c ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div ref={listTop} className="scroll-mt-40 space-y-6 px-4 py-4">
        {groups.length === 0 && <p className="py-12 text-center text-slate-500">No dishes match “{query}”.</p>}
        {groups.map(({ c, items }) => (
          <section key={c}>
            <h2 className="mb-2 text-lg font-black tracking-tight">{c}</h2>
            <div className="grid gap-3 md:grid-cols-2">
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
  const fromPrice = item.sizes?.length ? Math.min(...item.sizes.map((s) => s.price)) : item.price;
  return (
    <button
      onClick={onOpen}
      className={cn("flex w-full items-stretch gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 active:scale-[0.99]", !item.available && "opacity-60")}
    >
      <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-4xl">{item.emoji ?? "🍽️"}</div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <VegMark veg={item.veg} />
          <span className="truncate font-bold">{item.name}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{item.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1.5">
          {item.spiceLevel > 0 && <SpiceMeter level={item.spiceLevel} />}
          {item.allergens.slice(0, 2).map((a) => (
            <Badge key={a} tone="amber" className="text-[10px]">
              {a}
            </Badge>
          ))}
          {item.addOns?.some((a) => a.isCombo) && (
            <Badge tone="green" className="text-[10px]">
              Combo deal
            </Badge>
          )}
          {item.popular && (
            <Badge tone="brand" className="text-[10px]">
              Popular
            </Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between">
        <span className="text-sm font-bold">
          {item.sizes?.length ? <span className="text-xs font-medium text-slate-500">from </span> : null}
          {formatINR(fromPrice)}
        </span>
        {item.available ? (
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white" aria-hidden>
            <Plus className="size-5" />
          </span>
        ) : (
          <span className="text-xs font-bold uppercase text-red-600">Sold out</span>
        )}
      </div>
    </button>
  );
}
