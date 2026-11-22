"use client";

import { IndianRupee, Receipt, Star, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { StaffShell } from "@/components/staff/StaffShell";
import { Card, Segmented } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { salesToday } from "@/lib/selectors";
import { PAYMENT_METHODS } from "@/lib/types";
import { cn, formatINR, formatTime, isToday } from "@/lib/utils";

export default function SalesPage() {
  return <StaffShell title="Sales today">{() => <Dashboard />}</StaffShell>;
}

function Dashboard() {
  const { state } = useStore();
  const s = state!;
  const sales = salesToday(s);
  const [view, setView] = useState<"chart" | "table">("chart");

  const data = useMemo(() => {
    const payments = sales.payments;
    const avgTicket = payments.length ? sales.revenue / payments.length : 0;
    const reviews = s.reviews.filter((r) => isToday(r.createdAt));
    const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

    // Revenue by hour (paid)
    const byHour = new Map<number, number>();
    for (const p of payments) byHour.set(new Date(p.paidAt).getHours(), (byHour.get(new Date(p.paidAt).getHours()) ?? 0) + p.total);
    const hours = [...byHour.keys()];
    const nowH = new Date().getHours();
    const from = Math.min(11, ...hours, nowH);
    const to = Math.max(nowH, ...hours);
    const hourly = Array.from({ length: to - from + 1 }, (_, i) => ({ label: `${String(from + i).padStart(2, "0")}:00`, value: byHour.get(from + i) ?? 0 }));

    // Top dishes: paid lines + open/served orders today
    const dish = new Map<string, { qty: number; amount: number }>();
    for (const p of payments) for (const l of p.lines) {
      const d = dish.get(l.name) ?? { qty: 0, amount: 0 };
      d.qty += l.qty;
      d.amount += l.amount;
      dish.set(l.name, d);
    }
    for (const o of s.orders) if (!o.paid && o.status !== "cancelled" && isToday(o.createdAt)) for (const l of o.lines) {
      const d = dish.get(l.name) ?? { qty: 0, amount: 0 };
      d.qty += l.qty;
      d.amount += l.qty * l.unitPrice;
      dish.set(l.name, d);
    }
    const topDishes = [...dish.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount).slice(0, 8);

    const methods = PAYMENT_METHODS.map((m) => ({ label: m, value: payments.reduce((a, p) => a + p.shares.filter((x) => x.method === m).reduce((b, x) => b + x.amount, 0), 0) }));
    return { avgTicket, avgRating, reviews, hourly, topDishes, methods };
  }, [s, sales]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile icon={IndianRupee} label="Revenue (paid)" value={formatINR(sales.revenue)} sub="incl. GST & tips" />
        <Tile icon={TrendingUp} label="Open tickets" value={formatINR(sales.openValue)} sub="not yet paid" />
        <Tile icon={Receipt} label="Bills paid" value={String(sales.payments.length)} sub={`${sales.ordersToday} orders today`} />
        <Tile icon={Wallet} label="Avg. bill" value={formatINR(data.avgTicket)} sub={`${formatINR(sales.tips)} in tips`} />
        <Tile icon={Star} label="Avg. rating" value={data.avgRating ? data.avgRating.toFixed(1) : "–"} sub={`${data.reviews.length} reviews`} />
      </div>

      <div className="flex justify-end">
        <Segmented value={view} onChange={setView} options={[{ value: "chart", label: "Charts" }, { value: "table", label: "Table" }]} />
      </div>

      {view === "chart" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 lg:col-span-2">
            <h2 className="font-black">Revenue by hour</h2>
            <p className="mb-4 text-sm text-slate-500">Paid bills, by the hour they were settled</p>
            <ColumnChart data={data.hourly} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-black">Top dishes by revenue</h2>
            <BarList rows={data.topDishes.map((d) => ({ label: d.name, value: d.amount, note: `${d.qty} sold` }))} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-black">Payment methods</h2>
            <BarList rows={data.methods.map((m) => ({ label: m.label, value: m.value, note: sales.revenue ? `${Math.round((m.value / sales.revenue) * 100)}%` : "" }))} />
          </Card>
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Receipt</th>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Table</th>
                <th className="px-2 py-2">Method</th>
                <th className="px-2 py-2">Split</th>
                <th className="px-2 py-2 text-right">Tip</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...sales.payments].sort((a, b) => b.paidAt - a.paidAt).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-mono text-xs">{p.receiptNo}</td>
                  <td className="px-2">{formatTime(p.paidAt)}</td>
                  <td className="px-2">T{p.tableId.slice(1)}</td>
                  <td className="px-2">{[...new Set(p.shares.map((x) => x.method))].join(", ")}</td>
                  <td className="px-2">{p.splitWays > 1 ? `${p.splitWays} ways` : "–"}</td>
                  <td className="px-2 text-right tabular">{formatINR(p.tip)}</td>
                  <td className="px-4 text-right font-semibold tabular">{formatINR(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub }: { icon: typeof Star; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Icon className="size-4" /> {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular sm:text-3xl">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

/** Single-series column chart with recessive grid and per-bar hover tooltip. */
function ColumnChart({ data }: { data: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 1000) * 1000 || 1000;
  const ticks = [0, nice / 2, nice];
  return (
    <div className="relative" role="img" aria-label={`Revenue by hour: ${data.filter((d) => d.value).map((d) => `${d.label} ${formatINR(d.value)}`).join(", ") || "no sales yet"}`}>
      <div className="flex h-56 gap-2">
        <div className="flex w-14 flex-col-reverse justify-between pb-6 text-right text-[11px] text-slate-500 tabular">
          {ticks.map((t) => (
            <span key={t}>{t >= 1000 ? `₹${t / 1000}k` : `₹${t}`}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-slate-100" />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <div className={cn("w-full max-w-10 rounded-t-[4px] transition-colors", hover === i ? "bg-brand-700" : "bg-brand-500")} style={{ height: `${(d.value / nice) * 100}%`, minHeight: d.value ? 2 : 0 }} />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                    <div className="font-semibold">{d.label}</div>
                    <div className="tabular">{formatINR(d.value)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-5 gap-[2px] border-t border-slate-300">
            {data.map((d, i) => (
              <span key={d.label} className="flex-1 pt-1 text-center text-[10px] text-slate-500">
                {i % 2 === 0 ? d.label.slice(0, 2) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarList({ rows }: { rows: { label: string; value: number; note?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-slate-500">No data yet.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${formatINR(r.value)}${r.note ? ` (${r.note})` : ""}`}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="truncate font-medium text-slate-800">{r.label}</span>
            <span className="shrink-0 text-slate-600 tabular">
              <b className="text-slate-900">{formatINR(r.value)}</b> {r.note && <span className="text-xs">· {r.note}</span>}
            </span>
          </div>
          <div className="h-2.5 rounded-r-[4px] bg-slate-100">
            <div className="h-full rounded-r-[4px] bg-brand-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
