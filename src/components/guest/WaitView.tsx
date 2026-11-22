"use client";

import { Check, ChefHat, Clock, Copy, Gamepad2, Wifi } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { etaFor, orderTotal } from "@/lib/selectors";
import type { Order, OrderStatus, Settings } from "@/lib/types";
import { cn, copyText, formatClock, formatINR, formatTime } from "@/lib/utils";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Received" },
  { status: "sent", label: "In kitchen" },
  { status: "preparing", label: "Cooking" },
  { status: "ready", label: "Ready" },
  { status: "served", label: "Served" },
];
const stepIndex = (s: OrderStatus) => STEPS.findIndex((x) => x.status === s);

export function OrderTracker({ orders, onPlay }: { orders: Order[]; onPlay?: () => void }) {
  const now = useNow(1000);
  if (!orders.length)
    return (
      <Card className="p-6 text-center">
        <ChefHat className="mx-auto size-10 text-slate-300" />
        <p className="mt-2 font-semibold">No orders yet</p>
        <p className="text-sm text-slate-500">Orders you place will show up here with a live prep timer.</p>
      </Card>
    );

  const active = orders.filter((o) => o.status !== "served");
  const nextEta = active.map(etaFor).filter((x): x is number => x !== null).sort((a, b) => a - b)[0];

  return (
    <div className="space-y-3">
      {active.length > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-slate-900 px-5 py-5 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Clock className="size-4" /> {active.some((o) => o.status === "ready") ? "Food is on its way to your table" : "Estimated time to your table"}
            </div>
            <div className="mt-1 text-5xl font-black tabular" aria-live="polite">
              {active.some((o) => o.status === "ready") ? "Ready!" : nextEta ? (nextEta - now > 0 ? formatClock(nextEta - now) : "Any moment") : "Waiting…"}
            </div>
            {!nextEta && !active.some((o) => o.status === "ready") && <div className="mt-1 text-sm text-slate-300">A staff member is confirming your order with the kitchen.</div>}
          </div>
          {onPlay && (
            <button onClick={onPlay} className="flex w-full items-center gap-2 bg-brand-50 px-5 py-3 text-left text-sm font-semibold text-brand-800 hover:bg-brand-100">
              <Gamepad2 className="size-4" /> Bored? Play the Spice Quiz while you wait →
            </button>
          )}
        </Card>
      )}

      {[...orders].reverse().map((o) => {
        const idx = stepIndex(o.status);
        const eta = etaFor(o);
        return (
          <Card key={o.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-bold">Order #{o.number}</div>
              <div className="text-xs text-slate-500">
                {formatTime(o.createdAt)} · {formatINR(orderTotal(o))}
              </div>
            </div>
            <ol className="mt-3 flex items-center" aria-label="Order progress">
              {STEPS.map((s, i) => (
                <li key={s.status} className="flex flex-1 flex-col items-center last:flex-none">
                  <div className="flex w-full items-center">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        i < idx || o.status === "served" ? "bg-emerald-600 text-white" : i === idx ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-slate-200 text-slate-500",
                      )}
                    >
                      {i < idx || o.status === "served" ? <Check className="size-4" /> : i + 1}
                    </span>
                    {i < STEPS.length - 1 && <span className={cn("h-1 flex-1", i < idx ? "bg-emerald-600" : "bg-slate-200")} />}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-1 flex text-[11px] font-semibold text-slate-500">
              {STEPS.map((s, i) => (
                <span key={s.status} className={cn("flex-1 last:flex-none", i === idx && "text-brand-700")}>
                  {s.label}
                </span>
              ))}
            </div>
            {eta && o.status !== "served" && o.status !== "ready" && (
              <div className="mt-2 text-sm text-slate-600">
                About <b className="tabular">{Math.max(0, Math.ceil((eta - now) / 60000))} min</b> left
              </div>
            )}
            <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              {o.lines.map((l) => (
                <li key={l.lineId} className="flex justify-between gap-2">
                  <span className={cn(l.done && o.status !== "served" && "text-emerald-700")}>
                    {l.qty}× {l.name}
                    {l.sizeLabel && <span className="text-slate-500"> ({l.sizeLabel})</span>}
                    {l.done && o.status !== "served" && " ✓"}
                  </span>
                  <span className="text-slate-500">{formatINR(l.unitPrice * l.qty)}</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

export function WifiCard({ settings }: { settings: Settings }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <Wifi className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Free guest Wi-Fi</div>
        <div className="truncate font-bold">{settings.wifiSsid}</div>
        <div className="truncate font-mono text-sm text-slate-700">{settings.wifiPassword}</div>
      </div>
      <button
        onClick={async () => {
          if (await copyText(settings.wifiPassword)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }
        }}
        className={cn("flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold", copied ? "bg-emerald-600 text-white" : "bg-slate-900 text-white")}
        aria-label="Copy Wi-Fi password"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
      </button>
    </Card>
  );
}
