"use client";

import { Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { StaffShell } from "@/components/staff/StaffShell";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Sheet, SpiceMeter, VegMark } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { getSettings } from "@/lib/selectors";
import { ALLERGENS, CATEGORIES, STATIONS, type AddOn, type Allergen, type MenuItem, type SizeOption } from "@/lib/types";
import { cn, formatINR, uid } from "@/lib/utils";

export default function MenuAdminPage() {
  const [editing, setEditing] = useState<MenuItem | null>(null);
  return (
    <StaffShell
      title="Menu editor"
      actions={
        <Button onClick={() => setEditing(blankItem())}>
          <Plus className="size-4" /> Add dish
        </Button>
      }
    >
      {() => (
        <>
          <MenuTable onEdit={setEditing} />
          <SettingsCard />
          {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
        </>
      )}
    </StaffShell>
  );
}

function blankItem(): MenuItem {
  return { id: "", name: "", description: "", category: "Mains", station: "Curry", price: 0, allergens: [], spiceLevel: 1, veg: true, prepMinutes: 10, available: true, emoji: "🍽️", sortOrder: Date.now(), sizes: [], addOns: [] };
}

function MenuTable({ onEdit }: { onEdit: (m: MenuItem) => void }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const items = useMemo(
    () => [...state!.menu_items].sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.sortOrder - b.sortOrder).filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase())),
    [state, q],
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" aria-label="Search dishes" className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm" />
        </div>
        <span className="text-sm text-slate-500">
          {state!.menu_items.length} dishes · {state!.menu_items.filter((m) => !m.available).length} sold out
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Dish</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Station</th>
              <th className="px-2 py-2">Price</th>
              <th className="px-2 py-2">Allergens</th>
              <th className="px-2 py-2">Available</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((m) => (
              <tr key={m.id} className={cn(!m.available && "bg-slate-50 text-slate-500")}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{m.emoji}</span>
                    <VegMark veg={m.veg} />
                    <span className="font-semibold">{m.name}</span>
                    {m.spiceLevel > 0 && <SpiceMeter level={m.spiceLevel} />}
                  </div>
                </td>
                <td className="px-2">{m.category}</td>
                <td className="px-2">{m.station}</td>
                <td className="px-2 tabular">{m.sizes?.length ? m.sizes.map((s) => formatINR(s.price)).join(" / ") : formatINR(m.price)}</td>
                <td className="px-2">
                  <div className="flex flex-wrap gap-1">
                    {m.allergens.map((a) => (
                      <Badge key={a} tone="amber" className="text-[10px]">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-2">
                  <button
                    role="switch"
                    aria-checked={m.available}
                    aria-label={`${m.name} available`}
                    onClick={() => actions.toggleAvailability(m.id)}
                    className={cn("relative h-6 w-11 rounded-full transition", m.available ? "bg-emerald-600" : "bg-slate-300")}
                  >
                    <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", m.available ? "left-5.5" : "left-0.5")} />
                  </button>
                </td>
                <td className="px-4 text-right">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(m)} aria-label={`Edit ${m.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const input = "h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function ItemEditor({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { actions } = useStore();
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
        <Field label="Emoji">
          <input className={input} value={m.emoji ?? ""} onChange={(e) => set("emoji", e.target.value)} maxLength={4} />
        </Field>
        <Field label="Description" full>
          <textarea className={cn(input, "h-20 py-2")} value={m.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Category">
          <select className={input} value={m.category} onChange={(e) => set("category", e.target.value as MenuItem["category"])}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
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

function SettingsCard() {
  const { state, actions } = useStore();
  const toast = useToast();
  const s = getSettings(state!);
  const [form, setForm] = useState({ restaurantName: s.restaurantName, wifiSsid: s.wifiSsid, wifiPassword: s.wifiPassword, taxPct: String(Math.round(s.taxRate * 1000) / 10) });
  return (
    <Card className="mt-6 p-5">
      <h2 className="mb-3 font-black">Restaurant &amp; guest Wi-Fi</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Restaurant name">
          <input className={input} value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} />
        </Field>
        <Field label="Wi-Fi network">
          <input className={input} value={form.wifiSsid} onChange={(e) => setForm({ ...form, wifiSsid: e.target.value })} />
        </Field>
        <Field label="Wi-Fi password">
          <input className={input} value={form.wifiPassword} onChange={(e) => setForm({ ...form, wifiPassword: e.target.value })} />
        </Field>
        <Field label="GST %">
          <input className={input} type="number" step="0.5" min={0} value={form.taxPct} onChange={(e) => setForm({ ...form, taxPct: e.target.value })} />
        </Field>
      </div>
      <Button
        className="mt-4"
        onClick={() => {
          actions.updateSettings({ restaurantName: form.restaurantName.trim() || s.restaurantName, wifiSsid: form.wifiSsid, wifiPassword: form.wifiPassword, taxRate: Math.max(0, Number(form.taxPct) || 0) / 100 });
          toast("Settings saved");
        }}
      >
        <Save className="size-4" /> Save settings
      </Button>
    </Card>
  );
}
