"use client";

import { BellRing, ChefHat, CircleCheck, Send, X } from "lucide-react";
import { useState } from "react";
import { CallList } from "@/components/staff/CallList";
import { StaffShell } from "@/components/staff/StaffShell";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { useStore } from "@/lib/data/store";
import { useT } from "@/lib/i18n";
import { etaFor, openCalls, orderTotal } from "@/lib/selectors";
import type { Order } from "@/lib/types";
import { cn, formatClock, formatINR } from "@/lib/utils";

type Col = "new" | "kitchen" | "ready";

export default function StaffPage() {
  const t = useT();
  return (
    <StaffShell title={t("orders.title")} subtitle={t("orders.subtitle")} actions={<SendAll />}>
      {() => <Queue />}
    </StaffShell>
  );
}

function SendAll() {
  const { state, actions } = useStore();
  const t = useT();
  const toast = useToast();
  const placed = state?.orders.filter((o) => o.status === "placed") ?? [];
  if (placed.length < 2) return null;
  return (
    <Button
      size="lg"
      className="w-full sm:w-auto"
      onClick={() => {
        placed.forEach((o) => actions.sendToKitchen(o.id));
        toast(t("btn.sendAll", { n: placed.length }));
      }}
    >
      <Send className="size-5" /> {t("btn.sendAll", { n: placed.length })}
    </Button>
  );
}

function Queue() {
  const { state } = useStore();
  const t = useT();
  const s = state!;
  const [tab, setTab] = useState<Col>("new");
  const cols: Record<Col, Order[]> = {
    new: s.orders.filter((o) => o.status === "placed").sort((a, b) => a.createdAt - b.createdAt),
    kitchen: s.orders.filter((o) => o.status === "sent" || o.status === "preparing").sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0)),
    ready: s.orders.filter((o) => o.status === "ready").sort((a, b) => (a.readyAt ?? 0) - (b.readyAt ?? 0)),
  };
  const calls = openCalls(s);
  const meta: Record<Col, { label: string; dot: string }> = {
    new: { label: t("col.new"), dot: "bg-brand-500" },
    kitchen: { label: t("col.kitchen"), dot: "bg-sky-500" },
    ready: { label: t("col.ready"), dot: "bg-emerald-500" },
  };

  return (
    <div className="space-y-5">
      {calls.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-700">
            <BellRing className="size-4" /> {t("calls.title")} ({calls.length})
          </h2>
          <CallList calls={calls} />
        </section>
      )}

      {/* Phone: one column at a time, big tabs */}
      <div className="grid grid-cols-3 gap-2 lg:hidden" role="tablist">
        {(Object.keys(cols) as Col[]).map((c) => (
          <button key={c} role="tab" aria-selected={tab === c} onClick={() => setTab(c)} className={cn("flex h-14 flex-col items-center justify-center rounded-2xl text-sm font-bold", tab === c ? "bg-zinc-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", meta[c].dot)} /> {cols[c].length}
            </span>
            <span className="text-xs">{meta[c].label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(cols) as Col[]).map((c) => (
          <section key={c} className={cn("flex-col rounded-3xl bg-slate-100/80 p-3", tab === c ? "flex" : "hidden lg:flex")}>
            <h2 className="hidden items-center gap-2 px-2 pb-3 pt-1 text-sm font-bold lg:flex">
              <span className={cn("size-2.5 rounded-full", meta[c].dot)} /> {meta[c].label}
              <span className="ml-auto rounded-full bg-white px-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{cols[c].length}</span>
            </h2>
            <div className="flex flex-col gap-3">{cols[c].length ? cols[c].map((o) => <OrderCard key={o.id} order={o} />) : <p className="py-10 text-center text-sm text-slate-400">{t("empty")}</p>}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order: o }: { order: Order }) {
  const { actions } = useStore();
  const t = useT();
  const toast = useToast();
  const now = useNow(1000);
  const eta = etaFor(o);
  const late = eta !== null && now > eta && o.status !== "ready";
  const mins = Math.floor((now - o.createdAt) / 60000);

  return (
    <article className={cn("rounded-2xl border-2 bg-white p-4 shadow-sm", late ? "border-red-400" : "border-transparent")}>
      <div className="flex items-start gap-3">
        <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-zinc-900 text-white">
          <span className="text-[10px] font-semibold uppercase opacity-70">{t("table")}</span>
          <span className="text-2xl font-extrabold leading-none">{o.tableId.slice(1)}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-500">
              #{o.number} · {mins < 1 ? t("justNow") : t("minAgo", { n: mins })}
            </span>
            {eta && o.status !== "ready" && (
              <span className={cn("rounded-lg px-2 py-0.5 font-mono text-sm font-bold tabular", late ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700")}>{late ? `${t("late")} ${formatClock(now - eta)}` : formatClock(eta - now)}</span>
            )}
          </div>
          {o.guestName && <div className="text-sm font-semibold">{o.guestName}</div>}
        </div>
      </div>
      <ul className="mt-3 space-y-1">
        {o.lines.map((l) => (
          <li key={l.lineId} className={cn("text-[15px]", l.done && o.status !== "placed" && "text-slate-400 line-through")}>
            <b className="mr-1 inline-block min-w-7 rounded-md bg-slate-100 text-center">{l.qty}</b> {l.name}
            {l.sizeLabel && <span className="text-slate-500"> · {l.sizeLabel}</span>}
            {l.addOns.length > 0 && <span className="text-slate-500"> + {l.addOns.map((a) => a.name).join(", ")}</span>}
            {l.notes && <div className="pl-9 text-sm font-semibold text-red-700">⚠ {l.notes}</div>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <span className="text-sm font-semibold text-slate-500">{formatINR(orderTotal(o))}</span>
        <div className="ml-auto flex gap-2">
          {o.status === "placed" && (
            <>
              <Button variant="ghost" className="h-12 px-3" onClick={() => actions.cancelOrder(o.id)} aria-label={t("btn.cancel")}>
                <X className="size-5" />
              </Button>
              <Button
                className="h-12 px-5 text-base"
                onClick={() => {
                  actions.sendToKitchen(o.id);
                  toast(`#${o.number} → ${t("nav.kitchen")}`);
                }}
              >
                <ChefHat className="size-5" /> {t("btn.sendKitchen")}
              </Button>
            </>
          )}
          {o.status === "ready" && (
            <Button variant="success" className="h-12 px-5 text-base" onClick={() => actions.setOrderStatus(o.id, "served")}>
              <CircleCheck className="size-5" /> {t("btn.served")}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
