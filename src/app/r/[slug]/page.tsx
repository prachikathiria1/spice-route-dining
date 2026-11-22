"use client";

import { ArrowRight, BellRing, LogIn, QrCode, Smartphone, Sparkles, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DishImage, hasDishImage } from "@/components/guest/DishImage";
import { TableArt } from "@/components/guest/TableArt";
import { RoleBadge, useStaffRole } from "@/components/role";
import { useBase, useStore } from "@/lib/data/store";
import { FOOD_FACTS, greeting } from "@/lib/fun";
import { DEMO_SLUG } from "@/lib/seed";
import { HERO_IMAGE } from "@/lib/images";
import { sortedTables } from "@/lib/selectors";
import { cn, formatINR, tableNumber } from "@/lib/utils";

export default function RestaurantHome() {
  const { state, restaurantId } = useStore();
  const role = useStaffRole();
  const base = useBase();
  const [hi, setHi] = useState({ hello: "Welcome", line: "" });
  const [fact, setFact] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setHi(greeting());
    setFact(Math.floor(Math.random() * FOOD_FACTS.length));
    const id = setInterval(() => setFact((f) => (f + 1) % FOOD_FACTS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const s = state?.settings[0];
  const tables = state ? sortedTables(state) : [];
  const hero = s?.heroImage || (restaurantId === DEMO_SLUG ? HERO_IMAGE : null);
  const rating = useMemo(() => {
    const r = state?.reviews ?? [];
    return r.length ? { avg: r.reduce((a, x) => a + x.rating, 0) / r.length, n: r.length } : null;
  }, [state]);
  const favourites = (state?.menu_items ?? []).filter((m) => m.available && hasDishImage(m)).sort((a, b) => Number(!!b.popular) - Number(!!a.popular)).slice(0, 8);

  return (
    <div className="min-h-dvh bg-[#f6f5f3]">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brand-700 pb-24 text-white">
        {hero ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/30 to-brand-900/90" />
          </>
        ) : (
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900" />
        )}
        {/* floating spice dots */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          {[
            "left-[8%] top-[22%] size-3",
            "left-[82%] top-[18%] size-5",
            "left-[65%] top-[60%] size-2.5",
            "left-[20%] top-[70%] size-4",
            "left-[90%] top-[75%] size-3",
          ].map((c, i) => (
            <span key={i} className={cn("absolute animate-float rounded-full bg-white/25", c)} style={{ animationDelay: `${i * 0.9}s` }} />
          ))}
        </div>

        <div className="mx-auto max-w-3xl px-5 pt-4">
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-brand-700 shadow-lg">{(s?.restaurantName ?? "R").slice(0, 2).toUpperCase()}</span>
            <RoleBadge view={role ?? "customer"} light />
          </div>
          <div className="mt-10 animate-rise">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-white/80">
              <Sparkles className="size-4" /> {hi.hello}!
            </p>
            <h1 className="mt-1 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{s?.restaurantName ?? " "}</h1>
            {s?.tagline && <p className="mt-2 text-lg text-white/85">{s.tagline}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
              {rating && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                  <Star className="size-4 fill-amber-300 text-amber-300" /> {rating.avg.toFixed(1)} · {rating.n} happy guests
                </span>
              )}
              {s?.cuisine && <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{s.cuisine}</span>}
              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{hi.line}</span>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-16 max-w-3xl space-y-8 px-4 pb-16">
        {/* Table picker */}
        <section className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-200/60 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Where are you sitting?</h2>
              <p className="mt-0.5 text-sm text-slate-500">Tap your table, or scan the QR code on it.</p>
            </div>
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 sm:flex">
              <QrCode className="size-6" />
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4">
            {tables.map((t, i) => {
              const busy = !!t.sessionId;
              const n = tableNumber(t.id);
              return (
                <Link
                  key={t.id}
                  href={`${base}/t/${n}`}
                  onClick={() => setPicked(t.id)}
                  className={cn("group flex animate-pop flex-col items-center rounded-3xl p-1 transition hover:-translate-y-1 [&_.chair]:hover:scale-110", picked === t.id && "animate-wiggle")}
                  style={{ animationDelay: `${i * 60}ms` }}
                  aria-label={`Table ${n}, ${t.seats} seats${busy ? ", occupied" : ""}`}
                >
                  <TableArt number={n} seats={t.seats} busy={busy} className="w-full max-w-[7.5rem]" />
                  <span className={cn("mt-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold", busy ? "bg-brand-50 text-brand-700" : "text-slate-600")}>{busy ? "Join group" : `${t.seats} seats`}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Favourites */}
        {favourites.length > 0 && (
          <section>
            <h2 className="px-1 text-xl font-extrabold tracking-tight">Guests love these</h2>
            <div className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {favourites.map((m) => (
                <div key={m.id} className="relative w-40 shrink-0 snap-start overflow-hidden rounded-3xl bg-slate-200">
                  <DishImage item={m} className="aspect-[4/5] w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <div className="text-sm font-bold leading-tight">{m.name}</div>
                    <div className="text-xs text-white/80">{formatINR(m.sizes?.length ? Math.min(...m.sizes.map((x) => x.price)) : m.price)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="grid grid-cols-3 gap-2">
          {[
            { icon: Smartphone, title: "Order", text: "from your phone" },
            { icon: BellRing, title: "Call", text: "a waiter, one tap" },
            { icon: Wallet, title: "Pay", text: "& split at the table" },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl bg-white p-4 text-center ring-1 ring-slate-200/70">
              <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <Icon className="size-5" />
              </span>
              <div className="mt-2 font-extrabold">{title}</div>
              <div className="text-xs text-slate-500">{text}</div>
            </div>
          ))}
        </section>

        {/* Fun fact */}
        <section className="overflow-hidden rounded-3xl bg-zinc-900 p-5 text-white">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-300">Did you know?</div>
          <p key={fact} className="mt-1 animate-rise text-lg font-semibold leading-snug">
            {FOOD_FACTS[fact]}
          </p>
        </section>

        <div className="flex justify-center">
          {role ? (
            <Link href={role === "waiter" ? `${base}/staff` : `${base}/admin`} className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white">
              Open staff app <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Link href={`${base}/login`} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500">
              <LogIn className="size-4" /> Staff login
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
