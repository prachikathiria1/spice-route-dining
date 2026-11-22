"use client";

import { BellRing, ChefHat, CircleCheck, Send, X } from "lucide-react";
import { CallList } from "@/components/staff/CallList";
import { ORDER_STATUS_STYLE } from "@/components/staff/status";
import { StaffShell } from "@/components/staff/StaffShell";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { useStore } from "@/lib/data/store";
import { etaFor, openCalls, orderTotal } from "@/lib/selectors";
import type { Order } from "@/lib/types";
import { cn, formatAgo, formatClock, formatINR } from "@/lib/utils";

export default function StaffPage() {
  return (
    <StaffShell title="Orders" subtitle="Send new orders to the kitchen, serve what’s ready" actions={<SendAll />}>
      {() => <Queue />}
    </StaffShell>
  );
}

function SendAll() {
  const { state, actions } = useStore();
  const toast = useToast();
  const placed = state?.orders.filter((o) => o.status === "placed") ?? [];
  if (!placed.length) return null;
  return (
    <Button
      size="lg"
      onClick={() => {
        placed.forEach((o) => actions.sendToKitchen(o.id));
        toast(`${placed.length} order${placed.length > 1 ? "s" : ""} sent to kitchen`);
      }}
    >
      <Send className="size-5" /> Send all new ({placed.length}) to kitchen
    </Button>
  );
}

function Queue() {
  const { state } = useStore();
  const s = state!;
  const placed = s.orders.filter((o) => o.status === "placed").sort((a, b) => a.createdAt - b.createdAt);
  const cooking = s.orders.filter((o) => o.status === "sent" || o.status === "preparing").sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0));
  const ready = s.orders.filter((o) => o.status === "ready").sort((a, b) => (a.readyAt ?? 0) - (b.readyAt ?? 0));
  const calls = openCalls(s);

  return (
    <div className="space-y-6">
      {calls.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-700">
            <BellRing className="size-4" /> Waiter calls ({calls.length})
          </h2>
          <CallList calls={calls} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Column title="New" tone="brand" count={placed.length}>
          {placed.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </Column>
        <Column title="In the kitchen" tone="sky" count={cooking.length}>
          {cooking.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </Column>
        <Column title="Ready to serve" tone="green" count={ready.length}>
          {ready.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </Column>
      </div>
    </div>
  );
}

function Column({ title, count, tone, children }: { title: string; count: number; tone: "brand" | "sky" | "green"; children: React.ReactNode }) {
  const dot = { brand: "bg-brand-500", sky: "bg-sky-500", green: "bg-emerald-500" }[tone];
  return (
    <section className="flex flex-col rounded-3xl bg-slate-100/80 p-3">
      <h2 className="flex items-center gap-2 px-2 pb-3 pt-1 text-sm font-bold">
        <span className={cn("size-2.5 rounded-full", dot)} /> {title}
        <span className="ml-auto rounded-full bg-white px-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{count}</span>
      </h2>
      <div className="flex flex-col gap-3">{count ? children : <p className="py-10 text-center text-sm text-slate-400">Nothing here</p>}</div>
    </section>
  );
}

function OrderCard({ order: o }: { order: Order }) {
  const { actions } = useStore();
  const toast = useToast();
  const now = useNow(1000);
  const eta = etaFor(o);
  const late = eta !== null && now > eta && o.status !== "ready";
  const st = ORDER_STATUS_STYLE[o.status];

  return (
    <article className={cn("rounded-2xl border bg-white p-4 shadow-sm", late ? "border-red-300" : "border-slate-200/70")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xl font-extrabold leading-none">Table {o.tableId.slice(1)}</div>
          <div className="mt-1 text-xs text-slate-500">
            #{o.number} · {formatAgo(now - o.createdAt)}
            {o.guestName && <> · {o.guestName}</>}
          </div>
        </div>
        <div className="text-right">
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", st.chip)}>{st.label}</span>
          {eta && o.status !== "ready" && <div className={cn("mt-1 font-mono text-sm font-bold tabular", late ? "text-red-600" : "text-slate-600")}>{late ? `+${formatClock(now - eta)}` : formatClock(eta - now)}</div>}
        </div>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm">
        {o.lines.map((l) => (
          <li key={l.lineId} className={cn(l.done && o.status !== "placed" && "text-slate-400 line-through")}>
            <b>{l.qty}×</b> {l.name}
            {l.sizeLabel && <span className="text-slate-500"> · {l.sizeLabel}</span>}
            {l.addOns.length > 0 && <span className="text-slate-500"> + {l.addOns.map((a) => a.name).join(", ")}</span>}
            {l.notes && <div className="pl-5 text-xs italic text-brand-700">“{l.notes}”</div>}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-sm font-semibold text-slate-600">{formatINR(orderTotal(o))}</span>
        <div className="flex gap-2">
          {o.status === "placed" && (
            <>
              <Button size="sm" variant="ghost" onClick={() => actions.cancelOrder(o.id)} aria-label="Cancel order">
                <X className="size-4" />
              </Button>
              <Button
                size="md"
                onClick={() => {
                  actions.sendToKitchen(o.id);
                  toast(`Order #${o.number} sent to kitchen`);
                }}
              >
                <ChefHat className="size-4" /> Send to kitchen
              </Button>
            </>
          )}
          {o.status === "ready" && (
            <Button size="md" variant="success" onClick={() => actions.setOrderStatus(o.id, "served")}>
              <CircleCheck className="size-4" /> Mark served
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
