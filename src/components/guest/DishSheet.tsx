"use client";

import { AlertTriangle, BadgePercent, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Sheet, SpiceMeter, Stepper, VegMark } from "@/components/ui";
import type { MenuItem, OrderLine } from "@/lib/types";
import { cn, formatINR, uid } from "@/lib/utils";

export function DishSheet({ item, onClose, onAdd }: { item: MenuItem | null; onClose: () => void; onAdd: (line: OrderLine) => void }) {
  const [sizeId, setSizeId] = useState<string | undefined>();
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!item) return;
    // Default to the largest/"Full" size so the headline price matches.
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

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <VegMark veg={item.veg} /> {item.name}
        </span>
      }
      footer={
        <div className="flex items-center gap-3">
          <Stepper value={qty} onChange={setQty} min={1} max={20} />
          <Button
            size="lg"
            className="flex-1"
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
            {item.available ? `Add ${qty} · ${formatINR(unitPrice * qty)}` : "Sold out"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-5xl">{item.emoji ?? "🍽️"}</div>
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-slate-700">{item.description}</p>
            <div className="flex flex-wrap items-center gap-2">
              <SpiceMeter level={item.spiceLevel} showLabel />
              <Badge>
                <Clock className="size-3" /> ~{item.prepMinutes} min
              </Badge>
              {item.popular && <Badge tone="brand">Popular</Badge>}
            </div>
          </div>
        </div>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <AlertTriangle className="size-4 text-amber-600" /> Allergens
          </h3>
          {item.allergens.length ? (
            <div className="flex flex-wrap gap-1.5">
              {item.allergens.map((a) => (
                <Badge key={a} tone="amber">
                  {a}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No major allergens listed. Ask staff if you have a severe allergy.</p>
          )}
        </section>

        {item.sizes && item.sizes.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold">Portion</h3>
            <div className="grid grid-cols-2 gap-2">
              {item.sizes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSizeId(s.id)}
                  className={cn(
                    "rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
                    s.id === sizeId ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-sm text-slate-600">{formatINR(s.price)}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {item.addOns && item.addOns.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold">Add-ons &amp; combo deals</h3>
            <div className="space-y-2">
              {item.addOns.map((a) => {
                const on = addOnIds.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5", on ? "border-brand-600 bg-brand-50" : "border-slate-200")}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleAddOn(a.id)} className="size-4 accent-brand-600" />
                    <span className="flex-1 text-sm font-medium">
                      {a.name}
                      {a.isCombo && a.originalPrice && (
                        <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <BadgePercent className="size-3" /> Save {formatINR(a.originalPrice - a.price)}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold">
                      {a.originalPrice && <s className="mr-1 font-normal text-slate-400">{formatINR(a.originalPrice)}</s>}+{formatINR(a.price)}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <label htmlFor="dish-notes" className="mb-2 block text-sm font-bold">
            Special instructions <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="dish-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={120}
            placeholder="e.g. less oil, no onion"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </section>
      </div>
    </Sheet>
  );
}
