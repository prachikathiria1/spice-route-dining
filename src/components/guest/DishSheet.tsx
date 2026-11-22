"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Sheet, SpiceMeter, Stepper, VegMark } from "@/components/ui";
import type { MenuItem, OrderLine } from "@/lib/types";
import { cn, formatINR, uid } from "@/lib/utils";
import { DishImage, hasDishImage } from "./DishImage";

export function DishSheet({ item, onClose, onAdd }: { item: MenuItem | null; onClose: () => void; onAdd: (line: OrderLine) => void }) {
  const [sizeId, setSizeId] = useState<string | undefined>();
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!item) return;
    setSizeId(item.sizes?.[item.sizes.length - 1]?.id);
    setAddOnIds([]);
    setQty(1);
    setNotes("");
  }, [item]);

  if (!item) return null;
  const size = item.sizes?.find((s) => s.id === sizeId);
  const addOns = (item.addOns ?? []).filter((a) => addOnIds.includes(a.id));
  const unitPrice = (size?.price ?? item.price) + addOns.reduce((a, x) => a + x.price, 0);
  const toggleAddOn = (id: string) => setAddOnIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const photo = hasDishImage(item);

  return (
    <Sheet
      open
      bare
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <Stepper value={qty} onChange={setQty} min={1} max={20} />
          <Button
            size="lg"
            className="flex-1 rounded-2xl bg-zinc-900 hover:bg-black"
            disabled={!item.available}
            onClick={() => {
              onAdd({
                lineId: uid(),
                menuItemId: item.id,
                name: item.name,
                station: item.station,
                sizeLabel: size?.label,
                unitPrice,
                qty,
                addOns: addOns.map(({ id, name, price }) => ({ id, name, price })),
                notes: notes.trim() || undefined,
              });
              onClose();
            }}
          >
            {item.available ? `Add to order · ${formatINR(unitPrice * qty)}` : "Sold out"}
          </Button>
        </div>
      }
    >
      {photo && (
        <div className="aspect-[16/10] w-full bg-slate-100">
          <DishImage item={item} eager showTag className="size-full" />
        </div>
      )}
      <div className={cn("space-y-6 p-5", !photo && "pt-12")}>
        <div>
          <div className="flex items-center gap-2">
            <VegMark veg={item.veg} />
            {item.spiceLevel > 0 && <SpiceMeter level={item.spiceLevel} showLabel />}
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
              <Clock className="size-3.5" /> {item.prepMinutes} min
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{item.name}</h2>
          <p className="mt-1.5 leading-relaxed text-slate-600">{item.description}</p>
          {item.allergens.length > 0 && (
            <p className="mt-3 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">Contains:</span> {item.allergens.join(", ")}
            </p>
          )}
        </div>

        {item.sizes && item.sizes.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold">Portion</h3>
            <div className="grid grid-cols-2 gap-2">
              {item.sizes.map((s) => (
                <button key={s.id} onClick={() => setSizeId(s.id)} className={cn("rounded-2xl border-2 px-4 py-3 text-left transition", s.id === sizeId ? "border-zinc-900 bg-zinc-50" : "border-slate-200")}>
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-sm text-slate-500">{formatINR(s.price)}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {item.addOns && item.addOns.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold">Make it better</h3>
            <div className="space-y-2">
              {item.addOns.map((a) => {
                const on = addOnIds.includes(a.id);
                return (
                  <label key={a.id} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition", on ? "border-zinc-900 bg-zinc-50" : "border-slate-200")}>
                    <input type="checkbox" checked={on} onChange={() => toggleAddOn(a.id)} className="size-4 accent-zinc-900" />
                    <span className="flex-1 text-sm font-medium">
                      {a.name}
                      {a.isCombo && a.originalPrice ? <span className="ml-2 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">Save {formatINR(a.originalPrice - a.price)}</span> : null}
                    </span>
                    <span className="text-sm font-semibold">+{formatINR(a.price)}</span>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={120}
          placeholder="Any requests? e.g. less oil, no onion"
          aria-label="Special instructions"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-zinc-900 focus:bg-white"
        />
      </div>
    </Sheet>
  );
}
