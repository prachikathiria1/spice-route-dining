"use client";

import { Bell, BellOff, Check, Flame, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ORDER_STATUS_STYLE } from "@/components/staff/status";
import { StaffShell } from "@/components/staff/StaffShell";
import { Button } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { useStore } from "@/lib/data/store";
import { activeKitchenOrders } from "@/lib/selectors";
import { STATIONS, type Order, type Station } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

type Filter = Station | "All";

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.16);
    });
  } catch {
    /* audio blocked */
  }
}

export default function KitchenPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [sound, setSound] = useState(true);
  return (
    <StaffShell
      title="Kitchen display"
      actions={
        <Button variant="secondary" size="sm" onClick={() => setSound((s) => !s)} aria-pressed={sound}>
          {sound ? <Bell className="size-4" /> : <BellOff className="size-4" />} {sound ? "Sound on" : "Muted"}
        </Button>
      }
    >
      {() => <Kds filter={filter} setFilter={setFilter} sound={sound} />}
    </StaffShell>
  );
}

function Kds({ filter, setFilter, sound }: { filter: Filter; setFilter: (f: Filter) => void; sound: boolean }) {
  const { state } = useStore();
  const orders = activeKitchenOrders(state!);
  const visible = orders.filter((o) => filter === "All" || o.lines.some((l) => l.station === filter));
  const count = (st: Filter) => orders.filter((o) => o.status !== "ready" && (st === "All" || o.lines.some((l) => l.station === st && !l.done))).length;

  // Chime when a new ticket arrives.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(orders.map((o) => o.id));
    if (seen.current && sound && orders.some((o) => !seen.current!.has(o.id) && o.status === "sent")) beep();
    seen.current = ids;
  }, [orders, sound]);

  const cooking = visible.filter((o) => o.status !== "ready");
  const ready = visible.filter((o) => o.status === "ready");

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Stations">
        {(["All", ...STATIONS] as Filter[]).map((st) => (
          <button
            key={st}
            role="tab"
            aria-selected={filter === st}
            onClick={() => setFilter(st)}
            className={cn("flex h-12 shrink-0 items-center gap-2 rounded-xl px-5 text-base font-black", filter === st ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300")}
          >
            {st}
            <span className={cn("rounded-full px-2 text-sm", filter === st ? "bg-brand-500 text-white" : "bg-slate-100")}>{count(st)}</span>
          </button>
        ))}
      </div>

      {cooking.length === 0 && ready.length === 0 && (
        <div className="rounded-2xl bg-white py-20 text-center ring-1 ring-slate-200">
          <Flame className="mx-auto size-10 text-slate-300" />
          <p className="mt-2 text-lg font-bold text-slate-500">All clear{filter !== "All" ? ` at ${filter}` : ""}. No active tickets.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {cooking.map((o) => (
          <Ticket key={o.id} order={o} filter={filter} />
        ))}
      </div>

      {ready.length > 0 && (
        <>
          <h2 className="pt-2 text-sm font-black uppercase tracking-wide text-emerald-700">Ready for pickup ({ready.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {ready.map((o) => (
              <Ticket key={o.id} order={o} filter={filter} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Ticket({ order: o, filter }: { order: Order; filter: Filter }) {
  const { actions } = useStore();
  const now = useNow(1000);
  const since = o.sentAt ?? o.createdAt;
  const elapsed = now - since;
  const budget = o.estPrepMinutes * 60_000;
  const pct = Math.min(100, (elapsed / budget) * 100);
  const late = o.status !== "ready" && elapsed > budget;
  const warn = o.status !== "ready" && elapsed > budget * 0.75;
  const lines = filter === "All" ? o.lines : o.lines.filter((l) => l.station === filter);
  const others = o.lines.length - lines.length;
  const st = ORDER_STATUS_STYLE[o.status];

  return (
    <article className={cn("flex flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm", o.status === "ready" ? "border-emerald-500 opacity-80" : late ? "border-red-500" : warn ? "border-amber-400" : "border-slate-200")}>
      <header className={cn("flex items-center justify-between px-4 py-2.5", late ? "bg-red-600 text-white" : o.status === "ready" ? "bg-emerald-600 text-white" : "bg-slate-900 text-white")}>
        <div>
          <div className="text-2xl font-black leading-none">T{o.tableId.slice(1)}</div>
          <div className="text-xs opacity-80">
            #{o.number}
            {o.guestName && ` · ${o.guestName}`}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 font-mono text-2xl font-black tabular">
            <Timer className="size-5" /> {formatClock(o.status === "ready" && o.readyAt ? o.readyAt - since : elapsed)}
          </div>
          <div className="text-xs opacity-80">target {o.estPrepMinutes}m</div>
        </div>
      </header>
      <div className="h-1.5 bg-slate-100">
        <div className={cn("h-full", late ? "bg-red-500" : warn ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
      </div>
      <ul className="flex-1 divide-y divide-slate-100">
        {lines.map((l) => (
          <li key={l.lineId}>
            <button
              onClick={() => o.status !== "ready" && actions.toggleLineDone(o.id, l.lineId)}
              className={cn("flex w-full items-start gap-3 px-4 py-2.5 text-left", o.status !== "ready" && "hover:bg-slate-50")}
              aria-pressed={!!l.done}
            >
              <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2", l.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300")}>
                {l.done && <Check className="size-4" />}
              </span>
              <span className={cn("flex-1", l.done && "text-slate-400 line-through")}>
                <span className="text-lg font-black">{l.qty}×</span> <span className="text-lg font-bold">{l.name}</span>
                {l.sizeLabel && <span className="ml-1 rounded bg-slate-100 px-1.5 text-sm font-semibold text-slate-700">{l.sizeLabel}</span>}
                {l.addOns.length > 0 && <div className="text-sm text-slate-600">+ {l.addOns.map((a) => a.name).join(", ")}</div>}
                {l.notes && <div className="text-sm font-bold text-red-700">⚠ {l.notes}</div>}
              </span>
              {filter === "All" && <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold uppercase text-slate-600">{l.station}</span>}
            </button>
          </li>
        ))}
        {others > 0 && <li className="px-4 py-2 text-xs font-semibold text-slate-500">+ {others} item{others > 1 ? "s" : ""} at other stations</li>}
      </ul>
      <footer className="flex items-center gap-2 border-t border-slate-100 p-3">
        <span className={cn("rounded-md px-2 py-1 text-xs font-bold", st.chip)}>{st.label}</span>
        <div className="flex-1" />
        {o.status === "sent" && (
          <Button variant="dark" onClick={() => actions.setOrderStatus(o.id, "preparing")}>
            <Play className="size-4" /> Start
          </Button>
        )}
        {(o.status === "sent" || o.status === "preparing") && (
          <Button variant="success" onClick={() => actions.setOrderStatus(o.id, "ready")}>
            <Check className="size-4" /> Ready
          </Button>
        )}
        {o.status === "ready" && (
          <>
            <Button variant="ghost" size="sm" onClick={() => actions.setOrderStatus(o.id, "preparing")}>
              <RotateCcw className="size-4" /> Recall
            </Button>
            <Button variant="secondary" onClick={() => actions.setOrderStatus(o.id, "served")}>
              Bump (served)
            </Button>
          </>
        )}
      </footer>
    </article>
  );
}
