"use client";

import { BellRing, ClipboardList, ExternalLink, IndianRupee, LayoutGrid, QrCode, Receipt, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { QrTableCard } from "@/components/QrTableCard";
import { CallList } from "@/components/staff/CallList";
import { ORDER_STATUS_STYLE, TABLE_STATUS_STYLE } from "@/components/staff/status";
import { StaffShell } from "@/components/staff/StaffShell";
import { useToast } from "@/components/toast";
import { Button, Sheet } from "@/components/ui";
import { useBaseUrl } from "@/hooks/useBaseUrl";
import { useNow } from "@/hooks/useNow";
import { useStore } from "@/lib/data/store";
import { buildBill, getSettings, openCalls, orderTotal, salesToday, sessionOrders, sortedTables, tableStatus } from "@/lib/selectors";
import type { RestaurantTable } from "@/lib/types";
import { cn, formatClock, formatINR, tableNumber } from "@/lib/utils";

export default function FloorPage() {
  return <StaffShell title="Live floor">{() => <Floor />}</StaffShell>;
}

function Floor() {
  const { state } = useStore();
  const s = state!;
  const [selected, setSelected] = useState<string | null>(null);
  const tables = sortedTables(s);
  const sales = salesToday(s);
  const active = tables.filter((t) => t.sessionId).length;
  const openOrders = s.orders.filter((o) => !o.paid && o.status !== "cancelled" && o.status !== "served").length;
  const calls = openCalls(s);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={LayoutGrid} label="Active tables" value={`${active} / ${tables.length}`} />
        <Stat icon={ClipboardList} label="Open orders" value={String(openOrders)} sub={`${sales.ordersToday} today`} />
        <Stat icon={IndianRupee} label="Live sales today" value={formatINR(sales.revenue + sales.openValue)} sub={`${formatINR(sales.revenue)} paid · ${formatINR(sales.openValue)} open`} />
        <Stat icon={BellRing} label="Waiter calls" value={String(calls.length)} alert={calls.length > 0} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
        {(["Free", "Ordering", "Eating", "Bill", "Help"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-full", TABLE_STATUS_STYLE[k].dot)} /> {TABLE_STATUS_STYLE[k].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tables.map((t) => (
          <TableTile key={t.id} table={t} onOpen={() => setSelected(t.id)} />
        ))}
      </div>

      {calls.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-red-700">Waiter calls</h2>
          <CallList calls={calls} />
        </section>
      )}

      <TableSheet tableId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, alert }: { icon: typeof LayoutGrid; label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-4 ring-1", alert ? "bg-red-600 text-white ring-red-700" : "bg-white ring-slate-200")}>
      <div className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide", alert ? "text-red-100" : "text-slate-500")}>
        <Icon className="size-4" /> {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular sm:text-3xl">{value}</div>
      {sub && <div className={cn("text-xs", alert ? "text-red-100" : "text-slate-500")}>{sub}</div>}
    </div>
  );
}

function TableTile({ table, onOpen }: { table: RestaurantTable; onOpen: () => void }) {
  const { state } = useStore();
  const now = useNow(1000);
  const s = state!;
  const status = tableStatus(s, table);
  const calls = openCalls(s, table.id);
  const help = calls.length > 0;
  const style = TABLE_STATUS_STYLE[help ? "Help" : status];
  const orders = sessionOrders(s, table);
  const value = orders.reduce((a, o) => a + orderTotal(o), 0);
  const pending = orders.filter((o) => o.status !== "served");
  const oldestCall = calls[0];

  return (
    <button onClick={onOpen} className={cn("relative flex min-h-44 flex-col rounded-2xl border-2 p-4 text-left transition hover:shadow-md", style.card, help && "animate-pulse-ring")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-3xl font-black leading-none">T{tableNumber(table.id)}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Users className="size-3" /> {table.seats} seats
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {help && <span className={cn("rounded-lg px-2 py-1 text-xs font-black", TABLE_STATUS_STYLE.Help.chip)}>HELP</span>}
          <span className={cn("rounded-lg px-2 py-1 text-xs font-bold", TABLE_STATUS_STYLE[status].chip)}>{TABLE_STATUS_STYLE[status].label}</span>
        </div>
      </div>

      {help && oldestCall && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-white">
          <BellRing className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{oldestCall.tags.length ? oldestCall.tags.join(", ") : "Waiter called"}</span>
          <span className="font-mono text-sm font-black tabular">{formatClock(now - oldestCall.createdAt)}</span>
        </div>
      )}

      <div className="mt-auto space-y-1 pt-3 text-sm">
        {table.sessionId ? (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Seated</span>
              <span className="font-mono font-semibold tabular">{formatClock(now - (table.sessionStartedAt ?? now))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{orders.length} order{orders.length === 1 ? "" : "s"}</span>
              <span className="font-bold tabular">{formatINR(value)}</span>
            </div>
            {pending.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {pending.map((o) => (
                  <span key={o.id} className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold", ORDER_STATUS_STYLE[o.status].chip)}>
                    #{o.number} {ORDER_STATUS_STYLE[o.status].label}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-400">Available</div>
        )}
      </div>
    </button>
  );
}

function TableSheet({ tableId, onClose }: { tableId: string | null; onClose: () => void }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const baseUrl = useBaseUrl();
  const [showQr, setShowQr] = useState(false);
  const table = state && tableId ? state.restaurant_tables.find((t) => t.id === tableId) : undefined;
  if (!state || !table) return null;
  const bill = buildBill(state, table);
  const calls = openCalls(state, table.id);
  const settings = getSettings(state);

  return (
    <Sheet open onClose={() => { setShowQr(false); onClose(); }} title={`${table.label} · ${TABLE_STATUS_STYLE[tableStatus(state, table)].label}`} wide>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap gap-2">
          <Link href={`/t/${tableNumber(table.id)}`} target="_blank" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50">
            <ExternalLink className="size-4" /> Open guest view
          </Link>
          <Button variant="secondary" onClick={() => setShowQr((v) => !v)}>
            <QrCode className="size-4" /> {showQr ? "Hide QR" : "Show QR"}
          </Button>
          {table.sessionId && !table.billRequestedAt && (
            <Button variant="secondary" onClick={() => actions.requestBill(table.id)}>
              <Receipt className="size-4" /> Mark bill requested
            </Button>
          )}
          {table.sessionId && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Clear ${table.label}? Unpaid orders will be cancelled.`)) {
                  actions.clearTable(table.id);
                  toast(`${table.label} cleared`);
                  onClose();
                }
              }}
            >
              <XCircle className="size-4" /> Clear table
            </Button>
          )}
        </div>

        {showQr && (
          <div className="mx-auto max-w-xs">
            <QrTableCard tableId={table.id} label={table.label} baseUrl={baseUrl} restaurantName={settings.restaurantName} />
          </div>
        )}

        {calls.length > 0 && <CallList calls={calls} />}

        <div>
          <h3 className="mb-2 font-bold">Orders this visit</h3>
          {bill.orders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {bill.orders.map((o) => (
                <li key={o.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <b>#{o.number}</b>
                    <span className={cn("rounded px-1.5 py-0.5 text-xs font-bold", ORDER_STATUS_STYLE[o.status].chip)}>{ORDER_STATUS_STYLE[o.status].label}</span>
                  </div>
                  {o.lines.map((l) => (
                    <div key={l.lineId} className="flex justify-between">
                      <span>
                        {l.qty}× {l.name} {l.sizeLabel && <span className="text-slate-500">({l.sizeLabel})</span>}
                      </span>
                      <span className="tabular">{formatINR(l.unitPrice * l.qty)}</span>
                    </div>
                  ))}
                  {o.status === "placed" && (
                    <Button size="sm" className="mt-2" onClick={() => actions.sendToKitchen(o.id)}>
                      Send to kitchen
                    </Button>
                  )}
                  {o.status === "ready" && (
                    <Button size="sm" variant="success" className="mt-2" onClick={() => actions.setOrderStatus(o.id, "served")}>
                      Mark served
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {bill.subtotal > 0 && (
            <div className="mt-3 flex justify-between rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">
              <span>Running total (incl. GST)</span>
              <span className="tabular">{formatINR(bill.subtotal + bill.tax)}</span>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
