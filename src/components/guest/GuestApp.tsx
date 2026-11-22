"use client";

import { BellRing, ChefHat, Gamepad2, Receipt, ShoppingBag, Star, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReceiptView } from "@/components/ReceiptView";
import { useToast } from "@/components/toast";
import { Button, FullScreenLoader } from "@/components/ui";
import { useCart } from "@/hooks/useCart";
import { useStore } from "@/lib/data/store";
import { getSettings, getTable, openCalls, orderTotal, sessionOrders } from "@/lib/selectors";
import type { MenuItem } from "@/lib/types";
import { cn, formatINR, isToday } from "@/lib/utils";
import { BillView } from "./BillView";
import { CallWaiterSheet } from "./CallWaiterSheet";
import { CartSheet } from "./CartSheet";
import { DishSheet } from "./DishSheet";
import { MenuView } from "./MenuView";
import { SpiceQuiz } from "./SpiceQuiz";
import { OrderTracker, WifiCard } from "./WaitView";

type Tab = "menu" | "order" | "play" | "bill";

export function GuestApp({ tableId }: { tableId: string }) {
  const { state, actions, error } = useStore();
  const toast = useToast();
  const cart = useCart(tableId);
  const [tab, setTab] = useState<Tab>("menu");
  const [dish, setDish] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [paidId, setPaidId] = useState<string | null>(null);

  const table = state ? getTable(state, tableId) : undefined;

  // Scanning the QR opens a dining session (once per page load, so a tablemate's
  // open phone doesn't immediately re-open the table after the bill is paid).
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !state || !table) return;
    opened.current = true;
    if (!table.sessionId) actions.ensureSession(table.id);
  }, [state, table, actions]);

  const orders = useMemo(() => (state && table ? sessionOrders(state, table) : []), [state, table]);
  const calls = state ? openCalls(state, tableId) : [];
  const activeCall = calls[calls.length - 1];

  if (!state) return <FullScreenLoader label="Opening your table…" />;
  if (!table)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <UtensilsCrossed className="size-12 text-slate-300" />
        <h1 className="text-2xl font-black">Table not found</h1>
        <p className="text-slate-600">This QR code doesn&apos;t match a table here. Please ask a staff member.</p>
        <Link href="/" className="font-semibold text-brand-700 hover:underline">
          Go to the home page
        </Link>
      </div>
    );

  const settings = getSettings(state);
  const spent = orders.reduce((a, o) => a + orderTotal(o), 0);
  const quizCorrect = state.quiz_scores.filter((q) => q.tableId === table.id && q.sessionId && q.sessionId === table.sessionId && isToday(q.createdAt)).reduce((a, q) => a + q.correct, 0);
  const points = Math.floor(spent / settings.pointsPerRupees) + quizCorrect * 5;
  const activeOrders = orders.filter((o) => o.status !== "served").length;
  const paidPayment = paidId ? state.payments.find((p) => p.id === paidId) : undefined;

  const placeOrder = (guestName: string) => {
    if (!cart.lines.length) return;
    const unavailable = cart.lines.filter((l) => !state.menu_items.find((m) => m.id === l.menuItemId)?.available);
    if (unavailable.length) {
      toast(`${unavailable.map((u) => u.name).join(", ")} just sold out. Please remove it.`, "error");
      return;
    }
    const o = actions.placeOrder(table.id, cart.lines, guestName);
    cart.clear();
    setCartOpen(false);
    setTab("order");
    toast(`Order #${o.number} placed. Staff will confirm it shortly.`);
  };

  if (paidPayment)
    return (
      <div className="mx-auto min-h-dvh max-w-xl px-4 py-6">
        <ReceiptView payment={paidPayment} />
        <Button variant="ghost" className="no-print mt-4 w-full" onClick={() => { setPaidId(null); setTab("menu"); }}>
          Start a new order at {table.label}
        </Button>
      </div>
    );

  return (
    <div className="mx-auto min-h-dvh max-w-3xl bg-slate-50 pb-36">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-black leading-tight">{settings.restaurantName}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-800">{table.label}</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900" title="Rewards points for this visit">
              <Star className="size-3 fill-amber-500 text-amber-500" /> {points} pts
            </span>
          </div>
        </div>
        <button
          onClick={() => setCallOpen(true)}
          className={cn(
            "flex h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold text-white shadow-sm",
            activeCall ? "animate-pulse-ring bg-red-600" : "bg-red-600 hover:bg-red-700",
          )}
        >
          <BellRing className="size-4" /> {activeCall ? "Waiter called" : "Call waiter"}
        </button>
      </header>
      {error && <div className="bg-amber-100 px-4 py-2 text-xs text-amber-900">{error}</div>}

      {tab === "menu" && <MenuView menu={state.menu_items} onOpen={setDish} />}

      {tab === "order" && (
        <div className="space-y-4 p-4">
          <h1 className="text-xl font-black">Your orders</h1>
          <OrderTracker orders={orders} onPlay={() => setTab("play")} />
          <WifiCard settings={settings} />
          <RewardsCard points={points} />
        </div>
      )}

      {tab === "play" && (
        <div className="space-y-4 p-4">
          <SpiceQuiz table={table} />
          <WifiCard settings={settings} />
        </div>
      )}

      {tab === "bill" && (
        <div className="p-4">
          <BillView table={table} onPaid={setPaidId} />
        </div>
      )}

      {/* Floating cart bar */}
      {cart.count > 0 && tab === "menu" && (
        <div className="fixed inset-x-0 bottom-[72px] z-30 mx-auto max-w-3xl px-4">
          <button onClick={() => setCartOpen(true)} className="flex h-14 w-full animate-slide-up items-center justify-between rounded-2xl bg-brand-600 px-5 font-bold text-white shadow-xl hover:bg-brand-700">
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-5" /> {cart.count} item{cart.count > 1 ? "s" : ""}
            </span>
            <span>View cart · {formatINR(cart.total)}</span>
          </button>
        </div>
      )}

      {/* Bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-3xl grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]" aria-label="Guest navigation">
        {(
          [
            { id: "menu", label: "Menu", icon: UtensilsCrossed, badge: 0 },
            { id: "order", label: "My order", icon: ChefHat, badge: activeOrders },
            { id: "play", label: "Play", icon: Gamepad2, badge: 0 },
            { id: "bill", label: "Bill & pay", icon: Receipt, badge: 0 },
          ] as const
        ).map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setTab(id)} className={cn("relative flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold", tab === id ? "text-brand-700" : "text-slate-500")} aria-current={tab === id ? "page" : undefined}>
            <Icon className="size-5" />
            {label}
            {badge > 0 && <span className="absolute right-[calc(50%-22px)] top-2 min-w-4 rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{badge}</span>}
          </button>
        ))}
      </nav>

      <DishSheet item={dish} onClose={() => setDish(null)} onAdd={(l) => { cart.add(l); toast(`${l.qty}× ${l.name} added`); }} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} onPlace={placeOrder} taxRate={settings.taxRate} />
      <CallWaiterSheet
        open={callOpen}
        onClose={() => setCallOpen(false)}
        activeCall={activeCall}
        onCall={(tags, note) => {
          actions.callWaiter(table.id, tags, note);
          toast("A waiter has been notified");
          if (tags.includes("Bill")) {
            setCallOpen(false);
            setTab("bill");
          }
        }}
        onCancel={(id) => actions.resolveCall(id)}
      />
    </div>
  );
}

function RewardsCard({ points }: { points: number }) {
  const tier = points >= 150 ? "Gold" : points >= 60 ? "Silver" : "Bronze";
  const nextAt = points >= 150 ? null : points >= 60 ? 150 : 60;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-brand-600 p-4 text-white shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/80">Spice Rewards · this visit</div>
          <div className="text-3xl font-black tabular">{points} pts</div>
        </div>
        <div className="rounded-xl bg-white/20 px-3 py-1.5 text-sm font-black">{tier}</div>
      </div>
      {nextAt && (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (points / nextAt) * 100)}%` }} />
          </div>
          <div className="mt-1 text-xs text-white/90">{nextAt - points} pts to {nextAt === 60 ? "Silver" : "Gold"}. Earn 1 pt per ₹10 and 5 pts per quiz answer you get right.</div>
        </>
      )}
    </div>
  );
}
