"use client";

import { Check, Copy, Gamepad2, Wifi } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { etaFor } from "@/lib/selectors";
import type { Order, OrderStatus, Settings } from "@/lib/types";
import { cn, copyText, formatClock } from "@/lib/utils";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Received" },
  { status: "sent", label: "In kitchen" },
  { status: "preparing", label: "Cooking" },
  { status: "ready", label: "Ready" },
  { status: "served", label: "Served" },
];
const stepIndex = (s: OrderStatus) => STEPS.findIndex((x) => x.status === s);

const HEADLINE: Record<OrderStatus, string> = {
  placed: "Order received",
  sent: "Sent to the kitchen",
  preparing: "Your food is cooking",
  ready: "Ready! On its way to you",
  served: "Enjoy your meal",
  cancelled: "Cancelled",
};

export function OrderTracker({ orders, onPlay, onMenu }: { orders: Order[]; onPlay?: () => void; onMenu?: () => void }) {
  const now = useNow(1000);
  if (!orders.length)
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/70">
        <p className="text-lg font-extrabold">Nothing ordered yet</p>
        <p className="mt-1 text-sm text-slate-500">Your order and its live timer will show up here.</p>
        {onMenu && (
          <Button className="mt-5 rounded-2xl bg-zinc-900 hover:bg-black" onClick={onMenu}>
            Browse the menu
          </Button>
        )}
      </div>
    );

  const active = orders.filter((o) => o.status !== "served");
  // The furthest-behind active order drives the headline.
  const lead = [...active].sort((a, b) => stepIndex(a.status) - stepIndex(b.status))[0];
  const eta = lead ? etaFor(lead) : null;
  const left = eta ? eta - now : null;

  return (
    <div className="space-y-3">
      {lead ? (
        <div className="overflow-hidden rounded-3xl bg-zinc-900 text-white shadow-lg">
          <div className="p-6">
            <div className="text-sm font-medium text-white/60">{HEADLINE[lead.status]}</div>
            <div className="mt-1 text-6xl font-extrabold tracking-tight tabular" aria-live="polite">
              {lead.status === "ready" ? "Ready" : left === null ? "--:--" : left > 0 ? formatClock(left) : "Any minute"}
            </div>
            <div className="mt-1 text-sm text-white/60">{lead.status === "placed" ? "A waiter is confirming your order" : lead.status === "ready" ? "Coming to your table" : "Estimated time to your table"}</div>
            <div className="mt-5 flex gap-1.5" aria-label={`Step ${stepIndex(lead.status) + 1} of ${STEPS.length}`}>
              {STEPS.map((s, i) => (
                <div key={s.status} className={cn("h-1.5 flex-1 rounded-full", i <= stepIndex(lead.status) ? "bg-brand-500" : "bg-white/15")} />
              ))}
            </div>
          </div>
          {onPlay && (
            <button onClick={onPlay} className="flex w-full items-center justify-between border-t border-white/10 px-6 py-4 text-left text-sm font-semibold hover:bg-white/5">
              <span className="flex items-center gap-2">
                <Gamepad2 className="size-4 text-brand-400" /> Play the Spice Quiz while you wait
              </span>
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-emerald-600 p-6 text-white shadow-lg">
          <div className="text-2xl font-extrabold">Enjoy your meal</div>
          <div className="mt-1 text-sm text-white/80">Everything has been served. Want anything else?</div>
        </div>
      )}

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
        {[...orders].reverse().map((o, i) => (
          <div key={o.id} className={cn("p-5", i > 0 && "border-t border-slate-100")}>
            <div className="flex items-center justify-between">
              <span className="font-bold">Order #{o.number}</span>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", o.status === "served" ? "bg-slate-100 text-slate-600" : o.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-brand-100 text-brand-800")}>
                {STEPS[stepIndex(o.status)]?.label ?? o.status}
              </span>
            </div>
            <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
              {o.lines.map((l) => (
                <li key={l.lineId}>
                  {l.qty} × {l.name}
                  {l.sizeLabel && <span className="text-slate-400"> · {l.sizeLabel}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WifiCard({ settings }: { settings: Settings }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <Wifi className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-slate-500">Wi-Fi · {settings.wifiSsid}</div>
        <div className="truncate font-mono text-[15px] font-semibold">{settings.wifiPassword}</div>
      </div>
      <button
        onClick={async () => {
          if (await copyText(settings.wifiPassword)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }
        }}
        className={cn("flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition", copied ? "bg-emerald-600 text-white" : "bg-zinc-900 text-white")}
        aria-label="Copy Wi-Fi password"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
