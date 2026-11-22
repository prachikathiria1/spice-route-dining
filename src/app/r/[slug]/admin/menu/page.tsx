"use client";

import { Camera, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { shrinkImage } from "@/lib/image-utils";
import { useMemo, useState } from "react";
import { DishImage, hasDishImage } from "@/components/guest/DishImage";
import { StaffShell } from "@/components/staff/StaffShell";
import { useToast } from "@/components/toast";
import { Button, Card, Sheet, SpiceMeter, VegMark } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { ALLERGENS, orderCategories, STATIONS, type AddOn, type Allergen, type MenuItem, type SizeOption } from "@/lib/types";
import { cn, formatINR, uid } from "@/lib/utils";

export default function MenuAdminPage() {
  const [editing, setEditing] = useState<MenuItem | null>(null);
  return (
    <StaffShell
      title="Menu" subtitle="Toggle availability, edit prices and photos"
      actions={
        <Button onClick={() => setEditing(blankItem())}>
          <Plus className="size-4" /> Add dish
        </Button>
      }
    >
      {() => (
        <>
          <MenuTable onEdit={setEditing} />
          {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
        </>
      )}
    </StaffShell>
  );
}

function blankItem(): MenuItem {
  return { id: "", name: "", description: "", category: "Mains", station: "Curry", price: 0, allergens: [], spiceLevel: 1, veg: true, prepMinutes: 10, available: true, sortOrder: Date.now(), sizes: [], addOns: [] };
}

function MenuTable({ onEdit }: { onEdit: (m: MenuItem) => void }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const order = useMemo(() => orderCategories(state!.menu_items), [state]);
  const groups = useMemo(() => {
    const items = state!.menu_items.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()));
    return order.map((c) => ({ c, items: items.filter((m) => m.category === c).sort((a, b) => a.sortOrder - b.sortOrder) })).filter((g) => g.items.length);
  }, [state, q, order]);
  const soldOut = state!.menu_items.filter((m) => !m.available).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" aria-label="Search dishes" className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-9 pr-3 text-base" />
        </div>
        <span className="text-sm text-slate-500">
          {state!.menu_items.length} dishes{soldOut ? ` · ${soldOut} sold out` : ""}
        </span>
      </div>
      {groups.length === 0 && <Card className="p-10 text-center text-slate-500">No dishes yet. Tap “Add dish”, or ask your platform admin to import your menu.</Card>}
      {groups.map(({ c, items }) => (
        <section key={c}>
          <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-slate-500">{c}</h2>
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {items.map((m) => (
              <div key={m.id} className={cn("flex items-center gap-3 p-3", !m.available && "bg-slate-50")}>
                <button onClick={() => onEdit(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {hasDishImage(m) ? <DishImage item={m} className="size-14 shrink-0 rounded-xl" /> : <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-extrabold text-slate-400">{m.name.slice(0, 1)}</span>}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <VegMark veg={m.veg} />
                      <span className={cn("truncate font-bold", !m.available && "text-slate-400 line-through")}>{m.name}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-600 tabular">
                      {m.sizes?.length ? m.sizes.map((x) => `${x.label} ${formatINR(x.price)}`).join(" · ") : formatINR(m.price)}
                      {m.spiceLevel > 0 && <span className="ml-2 inline-block align-middle"><SpiceMeter level={m.spiceLevel} /></span>}
                    </span>
                  </span>
                </button>
                <button
                  role="switch"
                  aria-checked={m.available}
                  aria-label={`${m.name} available`}
                  onClick={() => {
                    actions.toggleAvailability(m.id);
                    toast(m.available ? `${m.name} marked sold out` : `${m.name} available again`);
                  }}
                  className={cn("flex h-10 shrink-0 items-center rounded-full px-3 text-xs font-bold", m.available ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}
                >
                  {m.available ? "In stock" : "Sold out"}
                </button>
                <Button size="sm" variant="ghost" className="h-10 w-10 p-0" onClick={() => onEdit(m)} aria-label={`Edit ${m.name}`}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hidden h-10 w-10 p-0 sm:inline-flex"
                  aria-label={`Delete ${m.name}`}
                  onClick={() => {
                    if (confirm(`Delete ${m.name}?`)) {
                      actions.deleteMenuItem(m.id);
                      toast(`${m.name} deleted`);
                    }
                  }}
                >
                  <Trash2 className="size-4 text-red-600" />
                </Button>
              </div>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}

const input = "h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function ItemEditor({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { actions, state, restaurantId } = useStore();
  const [uploading, setUploading] = useState(false);
  const categories = [...new Set([...orderCategories(state?.menu_items ?? []), "Starters", "Mains", "Breads", "Rice", "Desserts", "Drinks"])];
  const toast = useToast();
  const [m, setM] = useState<MenuItem>({ ...item, sizes: item.sizes ?? [], addOns: item.addOns ?? [] });
  const set = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) => setM((x) => ({ ...x, [k]: v }));
  const isNew = !item.id;

  function save() {
    if (!m.name.trim()) return toast("Name is required", "error");
    const sizes = (m.sizes ?? []).filter((s) => s.label.trim() && s.price > 0);
    const addOns = (m.addOns ?? []).filter((a) => a.name.trim());
    const price = sizes.length ? Math.max(...sizes.map((s) => s.price)) : m.price;
    if (!price) return toast("Set a price or at least one portion size", "error");
    const id = m.id || `${m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${uid().slice(0, 4)}`;
    actions.saveMenuItem({ ...m, id, name: m.name.trim(), price, sizes: sizes.length ? sizes : undefined, addOns: addOns.length ? addOns : undefined });
    toast(isNew ? `${m.name} added to the menu` : `${m.name} saved`);
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      wide
      title={isNew ? "Add dish" : `Edit ${item.name}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>
            <Save className="size-4" /> Save
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Name">
          <input className={input} value={m.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Photo URL (optional)">
          <div className="flex items-center gap-2">
            <input className={input} value={m.image ?? ""} onChange={(e) => set("image", e.target.value || undefined)} placeholder="https://… or upload" />
            <label className={cn("flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50", uploading && "opacity-50")}>
              <Camera className="size-4" /> {uploading ? "…" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append("rid", restaurantId);
                    fd.append("file", await shrinkImage(file));
                    const res = await fetch("/api/media", { method: "POST", body: fd });
                    const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
                    if (data.ok && data.url) set("image", data.url);
                    else toast(data.error ?? "Upload failed", "error");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            {hasDishImage(m) && <DishImage item={{ ...m, available: true }} className="size-10 shrink-0 rounded-lg" />}
          </div>
        </Field>
        <Field label="Description" full>
          <textarea className={cn(input, "h-20 py-2")} value={m.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Category">
          <input className={input} list="menu-categories" value={m.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Starters" />
          <datalist id="menu-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Kitchen station">
          <select className={input} value={m.station} onChange={(e) => set("station", e.target.value as MenuItem["station"])}>
            {STATIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Base price (₹), used if no portion sizes">
          <input className={input} type="number" min={0} value={m.price || ""} onChange={(e) => set("price", Number(e.target.value))} />
        </Field>
        <Field label="Prep time (minutes)">
          <input className={input} type="number" min={1} value={m.prepMinutes} onChange={(e) => set("prepMinutes", Number(e.target.value) || 1)} />
        </Field>
        <Field label="Spice level">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((l) => (
              <button key={l} type="button" onClick={() => set("spiceLevel", l as MenuItem["spiceLevel"])} className={cn("h-10 flex-1 rounded-xl border-2 text-sm font-bold", m.spiceLevel === l ? "border-brand-600 bg-brand-50" : "border-slate-200")}>
                {["None", "Mild", "Med", "Hot"][l]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Flags">
          <div className="flex flex-wrap gap-4 pt-2 text-sm">
            <Check label="Vegetarian" checked={m.veg} onChange={(v) => set("veg", v)} />
            <Check label="Popular" checked={!!m.popular} onChange={(v) => set("popular", v)} />
            <Check label="Available" checked={m.available} onChange={(v) => set("available", v)} />
          </div>
        </Field>
        <Field label="Allergens" full>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => {
              const on = m.allergens.includes(a);
              return (
                <button key={a} type="button" onClick={() => set("allergens", on ? m.allergens.filter((x) => x !== a) : [...m.allergens, a as Allergen])} className={cn("rounded-full border px-3 py-1 text-sm font-semibold", on ? "border-amber-500 bg-amber-100 text-amber-900" : "border-slate-300 text-slate-600")}>
                  {a}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Portion sizes (e.g. Half / Full)" full>
          <Rows<SizeOption>
            rows={m.sizes ?? []}
            onChange={(rows) => set("sizes", rows)}
            make={() => ({ id: uid().slice(0, 6), label: "", price: 0 })}
            render={(r, upd) => (
              <>
                <input className={input} placeholder="Label" value={r.label} onChange={(e) => upd({ label: e.target.value })} />
                <input className={cn(input, "w-28")} type="number" placeholder="₹" value={r.price || ""} onChange={(e) => upd({ price: Number(e.target.value) })} />
              </>
            )}
          />
        </Field>

        <Field label="Add-ons & combo deals" full>
          <Rows<AddOn>
            rows={m.addOns ?? []}
            onChange={(rows) => set("addOns", rows)}
            make={() => ({ id: uid().slice(0, 6), name: "", price: 0 })}
            render={(r, upd) => (
              <>
                <input className={input} placeholder="Name, e.g. Combo: Lassi + Dessert" value={r.name} onChange={(e) => upd({ name: e.target.value })} />
                <input className={cn(input, "w-24")} type="number" placeholder="₹" value={r.price || ""} onChange={(e) => upd({ price: Number(e.target.value) })} />
                <input className={cn(input, "w-28")} type="number" placeholder="Was ₹" title="Original price, shown as a saving" value={r.originalPrice || ""} onChange={(e) => upd({ originalPrice: Number(e.target.value) || undefined, isCombo: !!Number(e.target.value) })} />
              </>
            )}
          />
        </Field>
      </div>
    </Sheet>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("space-y-1", full && "sm:col-span-2")}>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 font-medium">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-brand-600" /> {label}
    </label>
  );
}

function Rows<T extends { id: string }>({ rows, onChange, make, render }: { rows: T[]; onChange: (r: T[]) => void; make: () => T; render: (row: T, update: (p: Partial<T>) => void) => React.ReactNode }) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="flex gap-2">
          {render(r, (p) => onChange(rows.map((x) => (x.id === r.id ? { ...x, ...p } : x))))}
          <Button variant="ghost" size="sm" className="h-10" onClick={() => onChange(rows.filter((x) => x.id !== r.id))} aria-label="Remove row">
            <Trash2 className="size-4 text-red-600" />
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...rows, make()])}>
        <Plus className="size-4" /> Add
      </Button>
    </div>
  );
}
