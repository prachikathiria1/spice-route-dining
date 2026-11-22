"use client";

import { Bot, FileImage, FileText, Loader2, Plus, ScanText, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { VegMark } from "@/components/ui";
import { detectCuisine, type ImportedItem } from "@/lib/menu-import";
import { filesToPages, readPage, type MenuPage, type ReadMode } from "@/lib/menu-reader";
import { cn, uid } from "@/lib/utils";

type Stage = "pick" | "reading" | "review";

export interface ImportResult {
  items: ImportedItem[];
  cuisine: string;
}

/**
 * Upload menu PDFs/photos → read every page (AI if configured, else PDF text / free OCR)
 * → editable review list. The parent decides what to do with the reviewed items.
 */
export function MenuImporter({ onChange, initial }: { onChange: (r: ImportResult) => void; initial?: ImportedItem[] }) {
  const [stage, setStage] = useState<Stage>(initial?.length ? "review" : "pick");
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [pages, setPages] = useState<MenuPage[]>([]);
  const [progress, setProgress] = useState<{ page: number; of: number; pct: number; mode?: ReadMode }>({ page: 0, of: 0, pct: 0 });
  const [items, setItems] = useState<ImportedItem[]>(initial ?? []);
  const [aiCuisine, setAiCuisine] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPage, setShowPage] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/menu/extract")
      .then((r) => r.json())
      .then((d: { ai?: boolean }) => setAiOn(!!d.ai))
      .catch(() => setAiOn(false));
  }, []);

  const cuisine = useMemo(() => aiCuisine || detectCuisine(items).cuisine, [aiCuisine, items]);
  useEffect(() => onChange({ items, cuisine }), [items, cuisine, onChange]);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setStage("reading");
    try {
      const pgs = await filesToPages([...list]);
      if (!pgs.length) throw new Error("Please choose PDF or image files (JPG, PNG).");
      setPages(pgs);
      const all: ImportedItem[] = [];
      const used = new Set<ReadMode>();
      const msgs: string[] = [];
      for (let i = 0; i < pgs.length; i++) {
        setProgress({ page: i + 1, of: pgs.length, pct: 0 });
        const r = await readPage(pgs[i], { preferAi: !!aiOn, onProgress: (pct) => setProgress((p) => ({ ...p, pct })) });
        used.add(r.mode);
        if (r.cuisine) setAiCuisine(r.cuisine);
        if (r.aiError && !msgs.includes(r.aiError)) msgs.push(r.aiError);
        all.push(...r.items);
      }
      if (used.has("ocr")) msgs.push("Some pages were read with free OCR. Please check names and prices carefully.");
      setNotes(msgs);
      setItems((prev) => [...prev, ...all]);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the files");
      setStage(items.length ? "review" : "pick");
    }
  }

  const update = (key: string, patch: Partial<ImportedItem>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const categories = [...new Set(items.map((i) => i.category))];

  if (stage === "pick")
    return (
      <div className="space-y-3">
        <ReaderBadge aiOn={aiOn} />
        <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-zinc-900">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-zinc-900 text-white">
            <Upload className="size-7" />
          </span>
          <span className="text-lg font-extrabold">Upload the menu</span>
          <span className="text-sm text-slate-500">PDF files or photos of each page. You can pick several at once, or take photos with your phone camera.</span>
        </button>
        <input ref={fileRef} type="file" multiple accept="application/pdf,image/*" className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button onClick={() => { setItems([newItem("Starters")]); setStage("review"); }} className="w-full text-sm font-semibold text-slate-500 underline">
          No menu file? Type items by hand
        </button>
      </div>
    );

  if (stage === "reading")
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-10 text-center ring-1 ring-slate-200">
        <Loader2 className="size-10 animate-spin text-brand-600" />
        <div className="text-lg font-extrabold">Reading your menu…</div>
        <div className="text-sm text-slate-500">
          {progress.of ? `Page ${progress.page} of ${progress.of}` : "Opening files"}
          {progress.pct > 0 && ` · ${Math.round(progress.pct * 100)}%`}
        </div>
        <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress.of ? ((progress.page - 1 + progress.pct) / progress.of) * 100 : 5}%` }} />
        </div>
        <p className="text-xs text-slate-400">{aiOn ? "Using AI reader" : "Using free text recognition: this can take ~20 seconds per photo"}</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">{items.length} items found</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Looks like: {cuisine}</span>
        <button onClick={() => fileRef.current?.click()} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold">
          <Upload className="size-4" /> Add more pages
        </button>
        <input ref={fileRef} type="file" multiple accept="application/pdf,image/*" className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
      </div>
      {notes.map((n) => (
        <p key={n} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{n}</p>
      ))}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {pages.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {pages.map((p, i) => (
            <button key={i} onClick={() => setShowPage(showPage === i ? null : i)} className={cn("shrink-0 overflow-hidden rounded-xl ring-2", showPage === i ? "ring-zinc-900" : "ring-transparent")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.label} className="h-20 w-16 object-cover" />
            </button>
          ))}
        </div>
      )}
      {showPage !== null && pages[showPage] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pages[showPage].image} alt={pages[showPage].label} className="max-h-[60vh] w-full rounded-2xl object-contain ring-1 ring-slate-200" />
      )}

      {categories.map((cat) => (
        <section key={cat} className="rounded-3xl bg-white p-3 ring-1 ring-slate-200">
          <input
            value={cat}
            onChange={(e) => setItems((xs) => xs.map((x) => (x.category === cat ? { ...x, category: e.target.value } : x)))}
            className="mb-2 h-10 w-full rounded-xl bg-slate-50 px-3 text-sm font-extrabold uppercase tracking-wide text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900"
            aria-label="Category name"
          />
          <ul className="divide-y divide-slate-100">
            {items.filter((i) => i.category === cat).map((i) => (
              <li key={i.key} className="space-y-2 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => update(i.key, { veg: !i.veg })} className="shrink-0 rounded-md p-1" aria-label={i.veg ? "Vegetarian, tap to change" : "Non-veg, tap to change"} title="Tap to switch veg / non-veg">
                    <VegMark veg={i.veg !== false} />
                  </button>
                  <input value={i.name} onChange={(e) => update(i.key, { name: e.target.value })} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 font-semibold" aria-label="Dish name" />
                  {!i.sizes.length && (
                    <input value={i.price || ""} onChange={(e) => update(i.key, { price: Number(e.target.value.replace(/\D/g, "")) })} inputMode="numeric" placeholder="₹" className={cn("h-11 w-20 rounded-xl border px-2 text-right font-semibold tabular", i.price ? "border-slate-200" : "border-red-300 bg-red-50")} aria-label="Price" />
                  )}
                  <button onClick={() => setItems((xs) => xs.filter((x) => x.key !== i.key))} className="shrink-0 rounded-xl p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove item">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {i.sizes.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-9">
                    {i.sizes.map((sz, k) => (
                      <span key={k} className="flex items-center gap-1 rounded-xl bg-slate-50 p-1">
                        <input value={sz.label} onChange={(e) => update(i.key, { sizes: i.sizes.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })} className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm" aria-label="Size" />
                        <input value={sz.price || ""} onChange={(e) => update(i.key, { sizes: i.sizes.map((x, j) => (j === k ? { ...x, price: Number(e.target.value.replace(/\D/g, "")) } : x)) })} inputMode="numeric" className="h-9 w-16 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm tabular" aria-label="Size price" />
                      </span>
                    ))}
                  </div>
                )}
                {i.description && <p className="pl-9 text-xs text-slate-500">{i.description}</p>}
              </li>
            ))}
          </ul>
          <button onClick={() => setItems((xs) => [...xs, newItem(cat)])} className="mt-1 inline-flex items-center gap-1 px-1 text-sm font-semibold text-brand-700">
            <Plus className="size-4" /> Add item to {cat || "this section"}
          </button>
        </section>
      ))}
      <button onClick={() => setItems((xs) => [...xs, newItem("New section")])} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 font-semibold text-slate-600">
        <Plus className="size-4" /> Add a section
      </button>
    </div>
  );
}

const newItem = (category: string): ImportedItem => ({ key: uid(), name: "", category, price: 0, sizes: [], description: "", veg: true, spiceLevel: 0 });

function ReaderBadge({ aiOn }: { aiOn: boolean | null }) {
  if (aiOn === null) return null;
  return aiOn ? (
    <p className="flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
      <Bot className="size-5 shrink-0" /> AI menu reader is on: it understands sections, Half/Full prices and veg marks.
    </p>
  ) : (
    <p className="flex items-start gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
      <span className="flex shrink-0 gap-1 pt-0.5">
        <FileText className="size-4" />
        <FileImage className="size-4" />
        <ScanText className="size-4" />
      </span>
      Free reader: digital PDFs are read exactly; photos use text recognition, so check prices. Add an <code className="rounded bg-white px-1">ANTHROPIC_API_KEY</code> on the server for the AI reader.
    </p>
  );
}
