"use client";

import { BarChart3, ChefHat, ClipboardList, LayoutGrid, QrCode, RotateCcw, Smartphone, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { ModeBadge } from "@/components/staff/StaffShell";
import { TABLE_STATUS_STYLE } from "@/components/staff/status";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { openCalls, sortedTables, tableStatus } from "@/lib/selectors";
import { cn, tableNumber } from "@/lib/utils";

const STAFF_LINKS = [
  { href: "/staff", label: "Staff order queue", desc: "Send new table orders to the kitchen in one tap", icon: ClipboardList },
  { href: "/kitchen", label: "Kitchen display", desc: "Live tickets, prep timers, station filters", icon: ChefHat },
  { href: "/floor", label: "Floor map", desc: "Table status, HELP alerts, live sales", icon: LayoutGrid },
  { href: "/qr", label: "QR codes", desc: "Print or test table QR codes", icon: QrCode },
  { href: "/admin/menu", label: "Menu editor", desc: "Add dishes, prices, allergens, sold-out", icon: UtensilsCrossed },
  { href: "/admin/sales", label: "Sales dashboard", desc: "Today's revenue, top dishes, ratings", icon: BarChart3 },
];

export default function Home() {
  const { state, actions, mode } = useStore();
  const toast = useToast();

  return (
    <div className="min-h-dvh">
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-black">SR</span>
            <ModeBadge />
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{state?.settings[0]?.restaurantName ?? "Spice Route"}</h1>
          <p className="mt-2 max-w-xl text-slate-300">Smart dining demo: scan, order, track, play, call a waiter and pay at the table, with a live kitchen display and floor map for staff.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-5 py-8">
        <section>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Smartphone className="size-5 text-brand-600" /> Guests: pick a table (same as scanning its QR)
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {(state ? sortedTables(state) : []).map((t) => {
              const help = state && openCalls(state, t.id).length > 0;
              const st = state ? tableStatus(state, t) : "Free";
              return (
                <Link key={t.id} href={`/t/${tableNumber(t.id)}`} className={cn("flex flex-col items-center rounded-2xl border-2 py-4 transition hover:shadow-md", TABLE_STATUS_STYLE[help ? "Help" : st].card)}>
                  <span className="text-2xl font-black">T{tableNumber(t.id)}</span>
                  <span className="text-xs font-semibold text-slate-600">{help ? "HELP" : st}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-black">Staff screens</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STAFF_LINKS.map(({ href, label, desc, icon: Icon }) => (
              <Link key={href} href={href} className="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-bold">{label}</span>
                  <span className="block text-sm text-slate-500">{desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <h2 className="mb-1 font-bold text-slate-900">Try it</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open <b>Table 5</b> in one tab and the <b>Floor map</b> or <b>Kitchen</b> in another.</li>
            <li>Order something, tap <b>Call waiter</b>, then watch the staff screens update live.</li>
            <li>Send the order from the <b>Staff queue</b>, bump it in the <b>Kitchen</b>, then split &amp; pay the bill (demo mode).</li>
          </ol>
          <p className="mt-3">
            {mode === "local"
              ? "Running in local demo mode: data syncs between tabs in this browser. Add Supabase keys to sync across devices."
              : "Connected to Supabase: changes sync across every device in realtime."}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={async () => {
              if (!confirm("Reset all demo data (orders, payments, menu edits) to the starting sample?")) return;
              await actions.reset();
              toast("Demo data reset");
            }}
          >
            <RotateCcw className="size-4" /> Reset demo data
          </Button>
        </section>
      </div>
    </div>
  );
}
