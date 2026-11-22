"use client";

import { BellRing, ChefHat, Gamepad2, Receipt, ShoppingBag, Star, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReceiptView } from "@/components/ReceiptView";
import { RoleBadge } from "@/components/role";
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

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const orders = useMemo(() => (state && table ? sessionOrders(state, table) : []), [state, table]);
  const calls = state ? openCalls(state, tableId) : [];
  const activeCall = calls[calls.length - 1];

  if (!state) return <FullScreenLoader label="Opening your table…" />;
  if (!table)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <UtensilsCrossed className="size-12 text-slate-300" />
        <h1 className="text-2xl font-extrabold">Table not found</h1>
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
    toast(`Order #${o.number} placed`);
  };

  if (paidPayment)
    return (
      <div className="min-h-dvh">
        <GuestHeader name={settings.restaurantName} table={table.label} />
        <div className="mx-auto max-w-xl px-4 py-6">
          <ReceiptView payment={paidPayment} />
          <Button variant="ghost" className="no-print mt-4 w-full" onClick={() => { setPaidId(null); setTab("menu"); }}>
            Start a new order at {table.label}
          </Button>
        </div>
      </div>
    );

  const showCartBar = cart.count > 0 && tab === "menu";

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-40">
      <GuestHeader name={settings.restaurantName} table={table.label} onCall={() => setCallOpen(true)} called={!!activeCall} />
      {error &&<div className="bg-amber-50 px-4 py-2 text-xs text-amber-900">{error}</div>}

      {tab === "menu" && <MenuView menu={state.menu_items} tableLabel={table.label} restaurantName={settings.restaurantName} onOpen={setDish} />}

      {tab === "order" && (
        <div className="space-y-4 p-4">
          <OrderTracker orders={orders} onPlay={() => setTab("play")} onMenu={() => setTab("menu")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <WifiCard settings={settings} />
            <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Star className="size-5 fill-amber-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Rewards this visit</div>
                <div className="text-lg font-extrabold tabular">{points} points</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "play" && (
        <div className="p-4">
          <SpiceQuiz table={table} />
        </div>
      )}

      {tab === "bill" && (
        <div className="p-4">
          <BillView table={table} onPaid={setPaidId} />
        </div>
      )}

      {showCartBar && (
        <div className="fixed inset-x-0 bottom-[72px] z-30 mx-auto max-w-2xl px-4">
          <button onClick={() => setCartOpen(true)} className="flex h-14 w-full animate-slide-up items-center justify-between rounded-2xl bg-emerald-700 px-5 font-bold text-white shadow-xl hover:bg-emerald-800">
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-5" /> {cart.count} item{cart.count > 1 ? "s" : ""} · {formatINR(cart.total)}
            </span>
            <span>View cart</span>
          </button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-2xl grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Guest navigation">
        {(
          [
            { id: "menu", label: "Menu", icon: UtensilsCrossed, badge: 0 },
            { id: "order", label: "My order", icon: ChefHat, badge: activeOrders },
            { id: "play", label: "Play", icon: Gamepad2, badge: 0 },
            { id: "bill", label: "Bill & pay", icon: Receipt, badge: 0 },
          ] as const
        ).map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setTab(id)} className={cn("relative flex h-[68px] flex-col items-center justify-center gap-1 text-[11px] font-semibold", tab === id ? "text-zinc-900" : "text-slate-400")} aria-current={tab === id ? "page" : undefined}>
            <Icon className={cn("size-5", tab === id && "stroke-[2.5]")} />
            {label}
            {badge > 0 && <span className="absolute right-[calc(50%-22px)] top-2.5 min-w-4 rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{badge}</span>}
          </button>
        ))}
      </nav>

      {dish && <DishSheet item={dish} onClose={() => setDish(null)} onAdd={(l) => { cart.add(l); toast(`${l.name} added`); }} />}
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} onPlace={placeOrder} taxRate={settings.taxRate} />
      <CallWaiterSheet
        open={callOpen}
        onClose={() => setCallOpen(false)}
        activeCall={activeCall}
        onCall={(tags, note) => {
          actions.callWaiter(table.id, tags, note);
          toast("A waiter is on the way");
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

function GuestHeader({ name, table, onCall, called }: { name: string; table: string; onCall?: () => void; called?: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur">
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[15px] font-extrabold tracking-tight">{name}</div>
        <div className="text-xs font-medium text-slate-500">{table}</div>
      </div>
      {onCall && (
        <button
          onClick={onCall}
          className={cn("flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition", called ? "animate-pulse-ring bg-red-600 text-white" : "bg-zinc-900 text-white")}
          aria-label={called ? "Waiter called, view request" : "Call waiter"}
        >
          <BellRing className="size-3.5" /> {called ? "Called" : "Waiter"}
        </button>
      )}
      <RoleBadge view="customer" />
    </header>
  );
}
