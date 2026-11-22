"use client";

import { ArrowRight, BellRing } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DishImage } from "@/components/guest/DishImage";
import { StaffShell } from "@/components/staff/StaffShell";
import { useStore } from "@/lib/data/store";
import { openCalls, salesToday } from "@/lib/selectors";
import { cn, formatINR, formatTime, isToday } from "@/lib/utils";

export default function AdminDashboard() {
  return <StaffShell title="Today" subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}>{() => <Dashboard />}</StaffShell>;
}

function Dashboard() {
  const { state } = useStore();
  const s = state!;
  const sales = salesToday(s);

  const d = useMemo(() => {
    const payments = sales.payments;
    const reviews = s.reviews.filter((r) => isToday(r.createdAt));
    const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

    const byHour = new Map<number, number>();
    for (const p of payments) {
      const h = new Date(p.paidAt).getHours();
      byHour.set(h, (byHour.get(h) ?? 0) + p.total);
    }
    const nowH = new Date().getHours();
    const from = Math.min(11, nowH, ...byHour.keys());
    const to = Math.max(nowH, ...byHour.keys());
    const hourly = Array.from({ length: to - from + 1 }, (_, i) => ({ hour: from + i, value: byHour.get(from + i) ?? 0 }));

    const dish = new Map<string, { qty: number; amount: number }>();
    const add = (name: string, qty: number, amount: number) => {
      const x = dish.get(name) ?? { qty: 0, amount: 0 };
      x.qty += qty;
      x.amount += amount;
      dish.set(name, x);
    };
    for (const p of payments) for (const l of p.lines) add(l.name, l.qty, l.amount);
    for (const o of s.orders) if (!o.paid && o.status !== "cancelled" && isToday(o.createdAt)) for (const l of o.lines) add(l.name, l.qty, l.qty * l.unitPrice);
    const byName = new Map(s.menu_items.map((m) => [m.name, m]));
    const top = [...dish.entries()].map(([name, v]) => ({ name, ...v, item: byName.get(name) })).sort((a, b) => b.amount - a.amount).slice(0, 5);

    return { avgRating, reviews: reviews.length, hourly, top, recent: [...payments].sort((a, b) => b.paidAt - a.paidAt).slice(0, 5) };
  }, [s, sales]);

  const occupied = s.restaurant_tables.filter((t) => t.sessionId).length;
  const calls = openCalls(s).length;
  const inProgress = s.orders.filter((o) => !o.paid && ["placed", "sent", "preparing", "ready"].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Revenue" value={formatINR(sales.revenue)} sub={`+ ${formatINR(sales.openValue)} on open tables`} />
        <Kpi label="Bills paid" value={String(sales.payments.length)} sub={`${sales.ordersToday} orders placed`} />
        <Kpi label="Average bill" value={formatINR(sales.payments.length ? sales.revenue / sales.payments.length : 0)} sub={`${formatINR(sales.tips)} in tips`} />
        <Kpi label="Guest rating" value={d.avgRating ? `${d.avgRating.toFixed(1)} ★` : "—"} sub={`${d.reviews} reviews`} />
      </div>

      <Link href="/floor" className={cn("flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl px-5 py-3.5 text-sm font-semibold transition", calls ? "bg-red-600 text-white hover:bg-red-700" : "bg-white ring-1 ring-slate-200/80 hover:ring-slate-300")}>
        <span>
          <b className="tabular">{occupied}</b>/{s.restaurant_tables.length} tables occupied
        </span>
        <span>
          <b className="tabular">{inProgress}</b> orders in progress
        </span>
        {calls > 0 && (
          <span className="flex items-center gap-1.5">
            <BellRing className="size-4" /> {calls} waiter call{calls > 1 ? "s" : ""}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          Live floor <ArrowRight className="size-4" />
        </span>
      </Link>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Revenue by hour" className="lg:col-span-3">
          <ColumnChart data={d.hourly} />
        </Panel>
        <Panel title="Best sellers" className="lg:col-span-2">
          <ol className="space-y-3">
            {d.top.map((t, i) => (
              <li key={t.name} className="flex items-center gap-3">
                <span className="w-4 text-sm font-bold text-slate-400">{i + 1}</span>
                {t.item ? <DishImage item={t.item} className="size-10 shrink-0 rounded-xl" /> : null}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.qty} sold</div>
                </div>
                <span className="text-sm font-bold tabular">{formatINR(t.amount)}</span>
              </li>
            ))}
            {!d.top.length && <p className="text-sm text-slate-500">No sales yet today.</p>}
          </ol>
        </Panel>
      </div>

      <Panel title="Latest bills">
        {d.recent.length ? (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {d.recent.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 text-slate-500">{formatTime(p.paidAt)}</td>
                  <td className="py-2.5 font-semibold">Table {p.tableId.slice(1)}</td>
                  <td className="hidden py-2.5 text-slate-500 sm:table-cell">{[...new Set(p.shares.map((x) => x.method))].join(", ")}{p.splitWays > 1 ? ` · split ${p.splitWays}` : ""}</td>
                  <td className="py-2.5 text-right font-bold tabular">{formatINR(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">No bills paid yet today.</p>
        )}
      </Panel>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/80">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-extrabold tracking-tight tabular">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl bg-white p-5 ring-1 ring-slate-200/80", className)}>
      <h2 className="mb-4 font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Single-series column chart: recessive grid, per-bar hover tooltip, text summary for screen readers. */
function ColumnChart({ data }: { data: { hour: number; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = Math.ceil(max / 1000) * 1000 || 1000;
  const label = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
  return (
    <div role="img" aria-label={`Revenue by hour: ${data.filter((d) => d.value).map((d) => `${label(d.hour)} ${formatINR(d.value)}`).join(", ") || "no sales yet"}`}>
      <div className="flex h-52 gap-2">
        <div className="flex w-10 flex-col justify-between pb-6 text-right text-[11px] text-slate-400 tabular">
          <span>₹{top / 1000}k</span>
          <span>₹{top / 2000}k</span>
          <span>₹0</span>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-t border-slate-100" />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div key={d.hour} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <div className={cn("w-full max-w-9 rounded-t-[4px] transition-colors", hover === i ? "bg-zinc-900" : "bg-brand-500")} style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value ? 2 : 0 }} />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                    <div className="font-semibold">{label(d.hour)}</div>
                    <div className="tabular">{formatINR(d.value)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-5 gap-[2px]">
            {data.map((d, i) => (
              <span key={d.hour} className="flex-1 pt-1 text-center text-[10px] text-slate-400">
                {i % 2 === 0 ? label(d.hour) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
