"use client";

import { BellRing, ExternalLink, MessageCircle, QrCode, Receipt, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { QrTableCard } from "@/components/QrTableCard";
import { useStaffRole } from "@/components/role";
import { CallList } from "@/components/staff/CallList";
import { ORDER_STATUS_STYLE, TABLE_STATUS_STYLE } from "@/components/staff/status";
import { StaffShell } from "@/components/staff/StaffShell";
import { useToast } from "@/components/toast";
import { Button, Sheet } from "@/components/ui";
import { useBaseUrl } from "@/hooks/useBaseUrl";
import { useNow } from "@/hooks/useNow";
import { useBase, useStore } from "@/lib/data/store";
import { useT, type TKey } from "@/lib/i18n";
import { buildBill, getSettings, openCalls, orderTotal, salesToday, sessionOrders, sortedTables, tableStatus } from "@/lib/selectors";
import type { RestaurantTable } from "@/lib/types";
import { cn, formatClock, formatINR, normalizePhone, tableNumber, waLink } from "@/lib/utils";

export default function FloorPage() {
  const t = useT();
  return <StaffShell title={t("floor.title")} subtitle={t("floor.subtitle")}>{() => <Floor />}</StaffShell>;
}

function Floor() {
  const { state } = useStore();
  const role = useStaffRole();
  const t = useT();
  const s = state!;
  const [selected, setSelected] = useState<string | null>(null);
  const tables = sortedTables(s);
  const occupied = tables.filter((t) => t.sessionId).length;
  const inProgress = s.orders.filter((o) => !o.paid && ["placed", "sent", "preparing", "ready"].includes(o.status)).length;
  const calls = openCalls(s);
  const sales = salesToday(s);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Stat label={t("floor.occupied")} value={`${occupied}/${tables.length}`} />
        <Stat label={t("floor.inProgress")} value={String(inProgress)} />
        <Stat label={t("floor.calls")} value={String(calls.length)} alert={calls.length > 0} />
        {(role === "admin" || role === "super") && <Stat label={t("floor.sales")} value={formatINR(sales.revenue + sales.openValue)} />}
      </div>

      {calls.length > 0 && <CallList calls={calls} />}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tables.map((t) => (
          <TableTile key={t.id} table={t} onOpen={() => setSelected(t.id)} />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
        {(["Free", "Ordering", "Eating", "Bill", "Help"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", TABLE_STATUS_STYLE[k].dot)} /> {t(("status." + k) as TKey)}
          </span>
        ))}
      </div>

      <TableSheet tableId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={cn("min-w-[9rem] flex-1 basis-[40%] rounded-2xl px-4 py-3 sm:basis-0 sm:px-5 sm:py-4", alert ? "bg-red-600 text-white" : "bg-white ring-1 ring-slate-200/80")}>
      <div className={cn("text-xs font-semibold", alert ? "text-red-100" : "text-slate-500")}>{label}</div>
      <div className="mt-0.5 text-3xl font-extrabold tracking-tight tabular">{value}</div>
    </div>
  );
}

function TableTile({ table, onOpen }: { table: RestaurantTable; onOpen: () => void }) {
  const { state } = useStore();
  const t = useT();
  const now = useNow(1000);
  const s = state!;
  const status = tableStatus(s, table);
  const calls = openCalls(s, table.id);
  const help = calls.length > 0;
  const style = TABLE_STATUS_STYLE[help ? "Help" : status];
  const value = sessionOrders(s, table).reduce((a, o) => a + orderTotal(o), 0);
  const call = calls[0];

  return (
    <button onClick={onOpen} className={cn("flex min-h-36 flex-col rounded-3xl border-2 p-4 sm:min-h-40 sm:p-5 text-left transition hover:shadow-lg", style.card, help && "animate-pulse-ring")}>
      <div className="flex items-start justify-between">
        <span className="text-4xl font-extrabold tracking-tight">{tableNumber(table.id)}</span>
        <span className="flex flex-wrap justify-end gap-1">
          {help && <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", TABLE_STATUS_STYLE.Help.chip)}>{t("status.Help")}</span>}
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", TABLE_STATUS_STYLE[status].chip)}>{t(("status." + status) as TKey)}</span>
        </span>
      </div>
      <div className="mt-auto">
        {help && call ? (
          <div className="flex items-center justify-between gap-2 text-red-700">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold">
              <BellRing className="size-4 shrink-0" /> {call.tags.length ? call.tags.map((x) => t(("tag." + x) as TKey)).join(", ") : t("calls.help")}
            </span>
            <span className="font-mono text-lg font-extrabold tabular">{formatClock(now - call.createdAt)}</span>
          </div>
        ) : table.sessionId ? (
          <div className="flex items-end justify-between text-sm">
            <span className="text-slate-500">{formatClock(now - (table.sessionStartedAt ?? now))} {t("floor.seated")}</span>
            <span className="text-lg font-extrabold tabular">{formatINR(value)}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">{table.seats} {t("floor.seats")} · {t("floor.free")}</span>
        )}
      </div>
    </button>
  );
}

function TableSheet({ tableId, onClose }: { tableId: string | null; onClose: () => void }) {
  const { state, actions } = useStore();
  const role = useStaffRole();
  const t = useT();
  const base = useBase();
  const toast = useToast();
  const baseUrl = useBaseUrl();
  const [showQr, setShowQr] = useState(false);
  const [phone, setPhone] = useState("");
  const table = state && tableId ? state.restaurant_tables.find((t) => t.id === tableId) : undefined;
  if (!state || !table) return null;
  const bill = buildBill(state, table);
  const calls = openCalls(state, table.id);

  return (
    <Sheet open onClose={() => { setShowQr(false); onClose(); }} title={`${t("table")} ${tableNumber(table.id)} · ${t(("status." + tableStatus(state, table)) as TKey)}`} wide>
      <div className="space-y-5 p-5">
        {calls.length > 0 && <CallList calls={calls} />}

        {bill.orders.length === 0 ? (
          <p className="text-sm text-slate-500">{t("sheet.noOrders")}</p>
        ) : (
          <ul className="space-y-2">
            {bill.orders.map((o) => (
              <li key={o.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <b>#{o.number}</b>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", ORDER_STATUS_STYLE[o.status].chip)}>{t(("ostatus." + o.status) as TKey)}</span>
                </div>
                {o.lines.map((l) => (
                  <div key={l.lineId} className="flex justify-between text-slate-700">
                    <span>
                      {l.qty} × {l.name} {l.sizeLabel && <span className="text-slate-400">· {l.sizeLabel}</span>}
                    </span>
                    <span className="tabular">{formatINR(l.unitPrice * l.qty)}</span>
                  </div>
                ))}
                {o.status === "placed" && (
                  <Button className="mt-3 h-11" onClick={() => actions.sendToKitchen(o.id)}>
                    {t("btn.sendKitchen")}
                  </Button>
                )}
                {o.status === "ready" && (
                  <Button variant="success" className="mt-3 h-11" onClick={() => actions.setOrderStatus(o.id, "served")}>
                    {t("btn.served")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {bill.subtotal > 0 && (
          <div className="flex justify-between rounded-2xl bg-zinc-900 px-5 py-4 font-bold text-white">
            <span>{t("sheet.total")}</span>
            <span className="tabular">{formatINR(bill.subtotal + bill.tax)}</span>
          </div>
        )}

        {bill.subtotal > 0 && (
          <div className="space-y-2 rounded-2xl bg-emerald-50 p-4">
            <label htmlFor="wa-phone" className="text-sm font-bold text-emerald-900">{t("sheet.whatsapp")}</label>
            <div className="flex gap-2">
              <input id="wa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder={t("sheet.phone")} className="h-12 min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 text-base outline-none focus:border-emerald-600" />
              <a
                href={waLink(billText(getSettings(state).restaurantName, table.label, bill), normalizePhone(phone))}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  if (phone && !normalizePhone(phone)) {
                    e.preventDefault();
                    toast("Check the mobile number", "error");
                  }
                }}
                className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white"
              >
                <MessageCircle className="size-5" /> WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          <Link href={`${base}/t/${tableNumber(table.id)}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50">
            <ExternalLink className="size-4" /> {t("sheet.customerView")}
          </Link>
          <Button variant="secondary" size="sm" className="h-10" onClick={() => setShowQr((v) => !v)}>
            <QrCode className="size-4" /> QR
          </Button>
          {table.sessionId && !table.billRequestedAt && (
            <Button variant="secondary" size="sm" className="h-10" onClick={() => actions.requestBill(table.id)}>
              <Receipt className="size-4" /> {t("sheet.billRequested")}
            </Button>
          )}
          {table.sessionId && (role === "admin" || role === "super") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm(`Clear ${table.label}? Unpaid orders will be cancelled.`)) {
                  actions.clearTable(table.id);
                  toast(`${table.label} cleared`);
                  onClose();
                }
              }}
            >
              <XCircle className="size-4" /> {t("sheet.clear")}
            </Button>
          )}
        </div>
        {showQr && (
          <div className="mx-auto max-w-xs">
            <QrTableCard slug={state.settings[0].slug} tableId={table.id} label={table.label} baseUrl={baseUrl} restaurantName={getSettings(state).restaurantName} />
          </div>
        )}
      </div>
    </Sheet>
  );
}

function billText(restaurant: string, table: string, bill: ReturnType<typeof buildBill>) {
  const lines = bill.lines.map((l) => `${l.qty} x ${l.name}${l.sizeLabel ? ` (${l.sizeLabel})` : ""}  ${formatINR(l.amount)}`);
  return [`*${restaurant}*: ${table} bill`, "", ...lines, "", `Subtotal: ${formatINR(bill.subtotal)}`, `GST: ${formatINR(bill.tax)}`, `*Total: ${formatINR(bill.subtotal + bill.tax)}*`, "", "Thank you for dining with us!"].join("\n");
}
