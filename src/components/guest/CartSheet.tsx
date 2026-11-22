"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Sheet, Stepper } from "@/components/ui";
import type { Cart } from "@/hooks/useCart";
import { formatINR } from "@/lib/utils";
import { DishImage } from "./DishImage";

export function CartSheet({ open, onClose, cart, onPlace, taxRate }: { open: boolean; onClose: () => void; cart: Cart; onPlace: (guestName: string) => void; taxRate: number }) {
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem("spice-route:guest-name") ?? "";
    } catch {
      return "";
    }
  });
  const [placing, setPlacing] = useState(false);
  const tax = Math.round(cart.total * taxRate);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <ShoppingBag className="size-5" /> Your order
        </span>
      }
      footer={
        cart.count > 0 ? (
          <Button
            size="lg"
            className="w-full rounded-2xl bg-emerald-700 hover:bg-emerald-800"
            loading={placing}
            onClick={() => {
              setPlacing(true);
              try {
                localStorage.setItem("spice-route:guest-name", name.trim());
              } catch {
                /* ignore */
              }
              onPlace(name.trim());
              setPlacing(false);
            }}
          >
            Place order · {formatINR(cart.total)}
          </Button>
        ) : undefined
      }
    >
      {cart.count === 0 ? (
        <div className="px-5 py-14 text-center text-slate-500">Your cart is empty. Add something tasty from the menu.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {cart.lines.map((l) => (
            <div key={l.lineId} className="flex items-start gap-3 px-5 py-3">
              <DishImage item={{ id: l.menuItemId, name: l.name, available: true }} className="size-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{l.name}</div>
                <div className="text-xs text-slate-500">
                  {[l.sizeLabel, ...l.addOns.map((a) => a.name)].filter(Boolean).join(" · ")}
                  {l.notes && <div className="italic">“{l.notes}”</div>}
                </div>
                <div className="mt-1 text-sm font-semibold">{formatINR(l.unitPrice * l.qty)}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => cart.setQty(l.lineId, 0)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${l.name}`}>
                  <Trash2 className="size-4" />
                </button>
                <Stepper size="sm" value={l.qty} min={0} onChange={(q) => cart.setQty(l.lineId, q)} />
              </div>
            </div>
          ))}
          <div className="space-y-1 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Items total</span>
              <span className="font-semibold">{formatINR(cart.total)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST ({Math.round(taxRate * 100)}%), added on your bill</span>
              <span>{formatINR(tax)}</span>
            </div>
          </div>
          <div className="px-5 py-4">
            <label htmlFor="guest-name" className="mb-1.5 block text-sm font-bold">
              Your name <span className="font-normal text-slate-500">(optional, helps staff)</span>
            </label>
            <input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="e.g. Priya"
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </div>
      )}
    </Sheet>
  );
}
