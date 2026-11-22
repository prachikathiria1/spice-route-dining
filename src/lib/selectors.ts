import type { DbState, Order, RestaurantTable, Settings, TableStatus, WaiterCall } from "./types";
import { isToday } from "./utils";

export const getSettings = (s: DbState): Settings => s.settings[0];

export const getTable = (s: DbState, tableId: string): RestaurantTable | undefined =>
  s.restaurant_tables.find((t) => t.id === tableId);

export const sortedTables = (s: DbState) =>
  [...s.restaurant_tables].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));

/** Unpaid, non-cancelled orders in the table's current session. */
export function sessionOrders(s: DbState, table: RestaurantTable | undefined): Order[] {
  if (!table?.sessionId) return [];
  return s.orders
    .filter((o) => o.tableId === table.id && o.sessionId === table.sessionId && o.status !== "cancelled" && !o.paid)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export const orderTotal = (o: Order) => o.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

export function openCalls(s: DbState, tableId?: string): WaiterCall[] {
  return s.waiter_calls
    .filter((c) => !c.resolvedAt && (!tableId || c.tableId === tableId))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function tableStatus(s: DbState, table: RestaurantTable): TableStatus {
  if (!table.sessionId) return "Free";
  if (table.billRequestedAt) return "Bill";
  const orders = sessionOrders(s, table);
  if (orders.some((o) => o.status === "served")) return "Eating";
  return "Ordering";
}

export interface BillLine {
  key: string;
  name: string;
  sizeLabel?: string;
  addOns: string[];
  qty: number;
  unitPrice: number;
  amount: number;
}

export function buildBill(s: DbState, table: RestaurantTable | undefined) {
  const settings = getSettings(s);
  const orders = sessionOrders(s, table);
  const map = new Map<string, BillLine>();
  for (const o of orders) {
    for (const l of o.lines) {
      const addOns = l.addOns.map((a) => a.name);
      const key = `${l.menuItemId}|${l.sizeLabel ?? ""}|${addOns.join(",")}|${l.unitPrice}`;
      const prev = map.get(key);
      if (prev) {
        prev.qty += l.qty;
        prev.amount += l.qty * l.unitPrice;
      } else {
        map.set(key, { key, name: l.name, sizeLabel: l.sizeLabel, addOns, qty: l.qty, unitPrice: l.unitPrice, amount: l.qty * l.unitPrice });
      }
    }
  }
  const lines = Array.from(map.values());
  const subtotal = lines.reduce((a, l) => a + l.amount, 0);
  const tax = Math.round(subtotal * settings.taxRate);
  return { orders, lines, subtotal, tax, taxRate: settings.taxRate };
}

export function salesToday(s: DbState, now = Date.now()) {
  const payments = s.payments.filter((p) => isToday(p.paidAt, now));
  const revenue = payments.reduce((a, p) => a + p.total, 0);
  const tips = payments.reduce((a, p) => a + p.tip, 0);
  // Open (unpaid) tickets count toward "live" sales on the floor.
  const openValue = s.restaurant_tables.reduce((sum, t) => sum + sessionOrders(s, t).reduce((a, o) => a + orderTotal(o), 0), 0);
  const ordersToday = s.orders.filter((o) => isToday(o.createdAt, now) && o.status !== "cancelled").length;
  return { payments, revenue, tips, openValue, ordersToday };
}

/** When the guest should expect the order (ms timestamp), or null if not yet sent. */
export function etaFor(o: Order): number | null {
  const start = o.sentAt ?? null;
  if (!start) return null;
  return start + o.estPrepMinutes * 60_000;
}

export const activeKitchenOrders = (s: DbState) =>
  s.orders.filter((o) => o.status === "sent" || o.status === "preparing" || o.status === "ready").sort((a, b) => (a.sentAt ?? a.createdAt) - (b.sentAt ?? b.createdAt));
