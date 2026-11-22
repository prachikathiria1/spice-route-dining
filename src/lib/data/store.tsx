"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildRestaurant, buildSeed, DEMO_SLUG, makeTables } from "../seed";
import type {
  CallTag,
  Collection,
  DbState,
  MenuItem,
  Order,
  OrderLine,
  OrderStatus,
  Payment,
  QuizScore,
  RecordOf,
  Review,
  Settings,
  WaiterCall,
} from "../types";
import { uid } from "../utils";
import { applyChange, RestaurantNotFound, type DataAdapter } from "./adapter";
import { createLocalAdapter } from "./local-adapter";
import { createSupabaseAdapter } from "./supabase-adapter";

interface StoreValue {
  restaurantId: string;
  /** true when the restaurant in the URL doesn't exist */
  notFound: boolean;
  state: DbState | null;
  mode: "local" | "supabase";
  error: string | null;
  actions: ReturnType<typeof makeActions>;
}

const StoreContext = createContext<StoreValue | null>(null);

export const supabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
};

function pickAdapter(rid: string): DataAdapter {
  const env = supabaseEnv();
  return env ? createSupabaseAdapter(env.url, env.key, rid) : createLocalAdapter(rid);
}

export function StoreProvider({ restaurantId, children }: { restaurantId: string; children: ReactNode }) {
  const [state, setState] = useState<DbState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adapter, setAdapter] = useState<DataAdapter | null>(null);
  const stateRef = useRef<DbState | null>(null);
  stateRef.current = state;

  /** Apply a change to both the ref (so chained actions see it immediately) and React state. */
  const apply = useCallback((ev: Parameters<typeof applyChange>[1]) => {
    if (stateRef.current) stateRef.current = applyChange(stateRef.current, ev);
    setState((s) => (s ? applyChange(s, ev) : s));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    (async () => {
      setState(null);
      setNotFound(false);
      let a = pickAdapter(restaurantId);
      let initial: DbState;
      try {
        initial = await a.load();
      } catch (e) {
        if (e instanceof RestaurantNotFound) {
          if (!cancelled) setNotFound(true);
          return;
        }
        console.error(e);
        setError(`${e instanceof Error ? e.message : String(e)} Falling back to local demo mode.`);
        a = createLocalAdapter(restaurantId);
        try {
          initial = await a.load();
        } catch {
          if (!cancelled) setNotFound(true);
          return;
        }
      }
      if (cancelled) return;
      unsub = a.subscribe(apply);
      setAdapter(a);
      setState(initial);
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [apply, restaurantId]);

  const write = useCallback(
    <C extends Collection>(collection: C, records: RecordOf<C>[]) => {
      if (!adapter || !records.length) return;
      apply({ type: "upsert", collection, records: records as { id: string }[] });
      void adapter.upsert(collection, records);
    },
    [adapter, apply],
  );

  const remove = useCallback(
    (collection: Collection, ids: string[]) => {
      if (!adapter) return;
      apply({ type: "remove", collection, ids });
      void adapter.remove(collection, ids);
    },
    [adapter, apply],
  );

  const reset = useCallback(async () => {
    if (!adapter) return;
    // The demo restaurant resets to sample data; real restaurants keep menu + settings and clear activity.
    const cur = stateRef.current;
    const seed =
      restaurantId === DEMO_SLUG || !cur
        ? buildSeed()
        : { ...buildRestaurant({ slug: restaurantId, restaurantName: "", tableCount: cur.restaurant_tables.length }), settings: cur.settings, menu_items: cur.menu_items, restaurant_tables: makeTables(cur.restaurant_tables.length) };
    stateRef.current = seed;
    setState(seed);
    await adapter.reset(seed);
  }, [adapter, restaurantId]);

  const actions = useMemo(() => makeActions(() => stateRef.current, write, remove, reset), [write, remove, reset]);

  const value = useMemo<StoreValue>(() => ({ restaurantId, notFound, state, mode: adapter?.mode ?? (supabaseEnv() ? "supabase" : "local"), error, actions }), [restaurantId, notFound, state, adapter, error, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

type Writer = <C extends Collection>(collection: C, records: RecordOf<C>[]) => void;

function makeActions(get: () => DbState | null, write: Writer, remove: (c: Collection, ids: string[]) => void, reset: () => Promise<void>) {
  const must = () => {
    const s = get();
    if (!s) throw new Error("Store not ready");
    return s;
  };
  const findOrder = (id: string) => must().orders.find((o) => o.id === id);
  const patchOrder = (id: string, patch: Partial<Order>) => {
    const o = findOrder(id);
    if (o) write("orders", [{ ...o, ...patch }]);
  };

  /** Opens a dining session on the table if there isn't one. Returns the session id. */
  function ensureSession(tableId: string): string {
    const s = must();
    const t = s.restaurant_tables.find((x) => x.id === tableId);
    if (!t) throw new Error(`Unknown table ${tableId}`);
    if (t.sessionId) return t.sessionId;
    const sessionId = uid();
    write("restaurant_tables", [{ ...t, sessionId, sessionStartedAt: Date.now(), billRequestedAt: null }]);
    return sessionId;
  }

  return {
    reset,
    ensureSession,

    placeOrder(tableId: string, lines: OrderLine[], guestName?: string): Order {
      const s = must();
      const sessionId = ensureSession(tableId);
      const settings = s.settings[0];
      const menu = new Map(s.menu_items.map((m) => [m.id, m]));
      const estPrepMinutes = Math.max(5, ...lines.map((l) => menu.get(l.menuItemId)?.prepMinutes ?? 10));
      const order: Order = {
        id: uid(),
        number: settings.nextOrderNumber,
        tableId,
        sessionId,
        lines,
        status: "placed",
        estPrepMinutes,
        createdAt: Date.now(),
        sentAt: null,
        startedAt: null,
        readyAt: null,
        servedAt: null,
        paid: false,
        guestName: guestName || undefined,
      };
      write("orders", [order]);
      write("settings", [{ ...settings, nextOrderNumber: settings.nextOrderNumber + 1 }]);
      return order;
    },

    sendToKitchen(orderId: string) {
      patchOrder(orderId, { status: "sent", sentAt: Date.now() });
    },

    setOrderStatus(orderId: string, status: OrderStatus) {
      const o = findOrder(orderId);
      if (!o) return;
      const now = Date.now();
      const patch: Partial<Order> = { status };
      if (status === "sent" && !o.sentAt) patch.sentAt = now;
      if (status === "preparing") {
        patch.startedAt = o.startedAt ?? now;
        patch.sentAt = o.sentAt ?? now;
      }
      if (status === "ready") {
        patch.readyAt = now;
        patch.lines = o.lines.map((l) => ({ ...l, done: true }));
      }
      if (status === "served") patch.servedAt = now;
      write("orders", [{ ...o, ...patch }]);
    },

    toggleLineDone(orderId: string, lineId: string) {
      const o = findOrder(orderId);
      if (!o) return;
      const lines = o.lines.map((l) => (l.lineId === lineId ? { ...l, done: !l.done } : l));
      const allDone = lines.every((l) => l.done);
      write("orders", [{ ...o, lines, status: allDone ? "ready" : o.status === "sent" ? "preparing" : o.status, startedAt: o.startedAt ?? Date.now(), readyAt: allDone ? Date.now() : o.readyAt }]);
    },

    cancelOrder(orderId: string) {
      patchOrder(orderId, { status: "cancelled" });
    },

    callWaiter(tableId: string, tags: CallTag[], note?: string): WaiterCall {
      ensureSession(tableId);
      const call: WaiterCall = { id: uid(), tableId, tags, note: note || undefined, createdAt: Date.now(), acknowledgedAt: null, resolvedAt: null };
      write("waiter_calls", [call]);
      if (tags.includes("Bill")) {
        const t = must().restaurant_tables.find((x) => x.id === tableId);
        if (t && !t.billRequestedAt) write("restaurant_tables", [{ ...t, billRequestedAt: Date.now() }]);
      }
      return call;
    },

    acknowledgeCall(id: string) {
      const c = must().waiter_calls.find((x) => x.id === id);
      if (c) write("waiter_calls", [{ ...c, acknowledgedAt: Date.now() }]);
    },

    resolveCall(id: string) {
      const c = must().waiter_calls.find((x) => x.id === id);
      if (c) write("waiter_calls", [{ ...c, resolvedAt: Date.now(), acknowledgedAt: c.acknowledgedAt ?? Date.now() }]);
    },

    resolveTableCalls(tableId: string) {
      const now = Date.now();
      write(
        "waiter_calls",
        must()
          .waiter_calls.filter((c) => c.tableId === tableId && !c.resolvedAt)
          .map((c) => ({ ...c, resolvedAt: now, acknowledgedAt: c.acknowledgedAt ?? now })),
      );
    },

    requestBill(tableId: string) {
      ensureSession(tableId);
      const t = must().restaurant_tables.find((x) => x.id === tableId);
      if (t && !t.billRequestedAt) write("restaurant_tables", [{ ...t, billRequestedAt: Date.now() }]);
    },

    completePayment(payment: Payment) {
      const s = must();
      write("payments", [payment]);
      write(
        "orders",
        s.orders.filter((o) => payment.orderIds.includes(o.id)).map((o) => ({ ...o, paid: true, status: o.status === "served" ? o.status : ("served" as const), servedAt: o.servedAt ?? Date.now() })),
      );
      const now = Date.now();
      write(
        "waiter_calls",
        s.waiter_calls.filter((c) => c.tableId === payment.tableId && !c.resolvedAt).map((c) => ({ ...c, resolvedAt: now, acknowledgedAt: c.acknowledgedAt ?? now })),
      );
      const t = s.restaurant_tables.find((x) => x.id === payment.tableId);
      if (t) write("restaurant_tables", [{ ...t, sessionId: null, sessionStartedAt: null, billRequestedAt: null }]);
    },

    /** Staff-side: close a table without a payment (walk-out, comp, mistake). */
    clearTable(tableId: string) {
      const s = must();
      const t = s.restaurant_tables.find((x) => x.id === tableId);
      if (!t) return;
      write(
        "orders",
        s.orders.filter((o) => o.tableId === tableId && o.sessionId === t.sessionId && !o.paid && o.status !== "cancelled").map((o) => ({ ...o, status: "cancelled" as const })),
      );
      const now = Date.now();
      write("waiter_calls", s.waiter_calls.filter((c) => c.tableId === tableId && !c.resolvedAt).map((c) => ({ ...c, resolvedAt: now })));
      write("restaurant_tables", [{ ...t, sessionId: null, sessionStartedAt: null, billRequestedAt: null }]);
    },

    updatePaymentEmail(paymentId: string, email: string) {
      const p = must().payments.find((x) => x.id === paymentId);
      if (p) write("payments", [{ ...p, receiptEmail: email }]);
    },

    addReview(review: Omit<Review, "id" | "createdAt">): string {
      const id = uid();
      write("reviews", [{ ...review, id, createdAt: Date.now() }]);
      return id;
    },
    updateReview(id: string, patch: Partial<Review>) {
      const r = must().reviews.find((x) => x.id === id);
      if (r) write("reviews", [{ ...r, ...patch }]);
    },
    /** Replace the whole menu (used by menu import). */
    replaceMenu(items: MenuItem[]) {
      const old = must().menu_items.map((m) => m.id);
      const keep = new Set(items.map((i) => i.id));
      remove("menu_items", old.filter((id) => !keep.has(id)));
      write("menu_items", items);
    },
    setTableCount(count: number) {
      const cur = must().restaurant_tables;
      const next = makeTables(count, cur);
      const drop = cur.filter((t) => !next.some((n) => n.id === t.id) && !t.sessionId).map((t) => t.id);
      write("restaurant_tables", next.filter((t) => !cur.includes(t)));
      if (drop.length) remove("restaurant_tables", drop);
    },

    addQuizScore(score: Omit<QuizScore, "id" | "createdAt">) {
      write("quiz_scores", [{ ...score, id: uid(), createdAt: Date.now() }]);
    },

    saveMenuItem(item: MenuItem) {
      write("menu_items", [item]);
    },
    deleteMenuItem(id: string) {
      remove("menu_items", [id]);
    },
    toggleAvailability(id: string) {
      const m = must().menu_items.find((x) => x.id === id);
      if (m) write("menu_items", [{ ...m, available: !m.available }]);
    },

    updateSettings(patch: Partial<Settings>) {
      const st = must().settings[0];
      write("settings", [{ ...st, ...patch }]);
    },
  };
}

/** URL prefix for the current restaurant, e.g. "/r/spice-route". */
export const useBase = () => `/r/${useStore().restaurantId}`;
