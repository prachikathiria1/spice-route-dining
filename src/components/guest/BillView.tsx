"use client";

import { CheckCircle2, Receipt, Users } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useStore } from "@/lib/data/store";
import { buildBill, getSettings } from "@/lib/selectors";
import type { Payment, PaymentMethod, PaymentShare, RestaurantTable } from "@/lib/types";
import { cn, formatINR, splitAmount, uid } from "@/lib/utils";
import { DemoBanner, PaymentSheet } from "./PaymentSheet";

const TIP_PRESETS = [0, 5, 10, 15];
const SPLIT_PRESETS = [1, 2, 3];

export function BillView({ table, onPaid }: { table: RestaurantTable; onPaid: (paymentId: string) => void }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [ways, setWays] = useState(1);
  const [customWays, setCustomWays] = useState("");
  const [tipPct, setTipPct] = useState(10);
  const [customTip, setCustomTip] = useState("");
  const [paidShares, setPaidShares] = useState<PaymentShare[]>([]);
  const [paying, setPaying] = useState<number | null>(null);

  if (!state) return null;
  const settings = getSettings(state);
  const bill = buildBill(state, table);
  const effectiveTip = customTip !== "" ? Math.max(0, Math.min(100, Number(customTip) || 0)) : tipPct;
  const tip = Math.round((bill.subtotal * effectiveTip) / 100);
  const total = bill.subtotal + bill.tax + tip;
  const shares = splitAmount(total, ways);
  const locked = paidShares.length > 0; // can't re-split once someone has paid
  const allServed = bill.orders.every((o) => o.status === "served");

  if (!bill.lines.length)
    return (
      <Card className="p-8 text-center">
        <Receipt className="mx-auto size-10 text-slate-300" />
        <p className="mt-2 font-semibold">Nothing to pay yet</p>
        <p className="text-sm text-slate-500">Your itemised bill will appear here once you&apos;ve ordered.</p>
      </Card>
    );

  function finish(allShares: PaymentShare[]) {
    const payment: Payment = {
      id: uid(),
      receiptNo: `SR-${Date.now().toString().slice(-6)}`,
      tableId: table.id,
      sessionId: table.sessionId ?? "",
      orderIds: bill.orders.map((o) => o.id),
      lines: bill.lines.map((l) => ({ name: l.addOns.length ? `${l.name} + ${l.addOns.join(", ")}` : l.name, qty: l.qty, amount: l.amount, sizeLabel: l.sizeLabel })),
      subtotal: bill.subtotal,
      tax: bill.tax,
      tipPercent: effectiveTip,
      tip,
      total,
      splitWays: ways,
      shares: allShares,
      paidAt: Date.now(),
      pointsEarned: Math.floor(bill.subtotal / settings.pointsPerRupees),
      demo: true,
    };
    actions.completePayment(payment);
    toast("Payment complete. Thank you!");
    onPaid(payment.id);
  }

  function onSharePaid(index: number, method: PaymentMethod, reference: string) {
    const next = [...paidShares, { index, amount: shares[index], method, reference, paidAt: Date.now() }];
    setPaidShares(next);
    setPaying(null);
    if (next.length === shares.length) finish(next);
  }

  return (
    <div className="space-y-4">
      <DemoBanner />
      {!allServed && <div className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">Some items are still being prepared. You can pay now or wait until you&apos;re done.</div>}

      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-black">Itemised bill · {table.label}</h2>
          {!table.billRequestedAt && (
            <button className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => { actions.requestBill(table.id); toast("Staff notified you're ready for the bill"); }}>
              Notify staff
            </button>
          )}
        </div>
        <ul className="divide-y divide-slate-100 px-4">
          {bill.lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3 py-2.5 text-sm">
              <div>
                <div className="font-semibold">
                  {l.qty}× {l.name}
                </div>
                {(l.sizeLabel || l.addOns.length > 0) && <div className="text-xs text-slate-500">{[l.sizeLabel, ...l.addOns].filter(Boolean).join(" · ")}</div>}
              </div>
              <div className="tabular">{formatINR(l.amount)}</div>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-slate-200 px-4 py-3 text-sm">
          <Row label="Subtotal" value={bill.subtotal} />
          <Row label={`CGST ${(bill.taxRate * 50).toFixed(1)}%`} value={Math.floor(bill.tax / 2)} muted />
          <Row label={`SGST ${(bill.taxRate * 50).toFixed(1)}%`} value={bill.tax - Math.floor(bill.tax / 2)} muted />
          <Row label={`Tip (${effectiveTip}%)`} value={tip} muted />
          <div className="flex justify-between pt-2 text-lg font-black">
            <span>Total</span>
            <span className="tabular">{formatINR(total)}</span>
          </div>
        </div>
      </Card>

      <Card className={cn("space-y-3 p-4", locked && "opacity-60")}>
        <h3 className="font-bold">Add a tip for the team</h3>
        <div className="grid grid-cols-5 gap-2">
          {TIP_PRESETS.map((p) => (
            <Chip key={p} active={customTip === "" && tipPct === p} disabled={locked} onClick={() => { setTipPct(p); setCustomTip(""); }}>
              {p === 0 ? "None" : `${p}%`}
            </Chip>
          ))}
          <input
            value={customTip}
            disabled={locked}
            onChange={(e) => setCustomTip(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            inputMode="numeric"
            placeholder="%"
            aria-label="Custom tip percent"
            className={cn("h-11 min-w-0 rounded-xl border-2 text-center text-sm font-bold outline-none", customTip !== "" ? "border-brand-600 bg-brand-50" : "border-slate-200")}
          />
        </div>
      </Card>

      <Card className={cn("space-y-3 p-4", locked && "opacity-60")}>
        <h3 className="flex items-center gap-2 font-bold">
          <Users className="size-4" /> Split the bill
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {SPLIT_PRESETS.map((n) => (
            <Chip key={n} active={customWays === "" && ways === n} disabled={locked} onClick={() => { setWays(n); setCustomWays(""); }}>
              {n === 1 ? "No split" : `${n} ways`}
            </Chip>
          ))}
          <input
            value={customWays}
            disabled={locked}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
              setCustomWays(v);
              const n = Number(v);
              if (n >= 1 && n <= 20) setWays(n);
            }}
            inputMode="numeric"
            placeholder="Custom"
            aria-label="Custom number of ways to split"
            className={cn("h-11 min-w-0 rounded-xl border-2 text-center text-sm font-bold outline-none", customWays !== "" ? "border-brand-600 bg-brand-50" : "border-slate-200")}
          />
        </div>
      </Card>

      <Card className="divide-y divide-slate-100">
        {shares.map((amt, i) => {
          const paid = paidShares.find((s) => s.index === i);
          return (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-bold">{ways === 1 ? "Full amount" : `Guest ${i + 1}`}</div>
                <div className="text-sm text-slate-500 tabular">{formatINR(amt)}</div>
              </div>
              {paid ? (
                <span className="flex items-center gap-1 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="size-4" /> Paid · {paid.method}
                </span>
              ) : (
                <Button onClick={() => setPaying(i)}>Pay {formatINR(amt)}</Button>
              )}
            </div>
          );
        })}
      </Card>
      <p className="text-center text-xs text-slate-500">You&apos;ll earn {Math.floor(bill.subtotal / settings.pointsPerRupees)} reward points on this visit.</p>

      <PaymentSheet
        open={paying !== null}
        amount={paying !== null ? shares[paying] : 0}
        label={ways === 1 ? formatINR(total) : `Guest ${(paying ?? 0) + 1}'s share`}
        onClose={() => setPaying(null)}
        onPaid={(m, ref) => paying !== null && onSharePaid(paying, m, ref)}
      />
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between", muted && "text-slate-500")}>
      <span>{label}</span>
      <span className="tabular">{formatINR(value)}</span>
    </div>
  );
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn("h-11 rounded-xl border-2 text-sm font-bold transition disabled:cursor-not-allowed", active ? "border-brand-600 bg-brand-50 text-brand-900" : "border-slate-200 text-slate-700 hover:border-slate-300")}
    >
      {children}
    </button>
  );
}
