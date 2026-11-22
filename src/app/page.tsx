import { BellRing, ChefHat, Crown, Languages, LayoutGrid, MessageCircle, QrCode, Smartphone, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { HERO_IMAGE } from "@/lib/images";
import { DEMO_SLUG } from "@/lib/seed";

const FEATURES = [
  { icon: QrCode, title: "Scan & order", text: "Guests order from their phone. No app download." },
  { icon: ChefHat, title: "Kitchen screen", text: "Orders reach the kitchen instantly, with timers." },
  { icon: LayoutGrid, title: "Live tables", text: "See which table needs water, the bill or help." },
  { icon: Wallet, title: "Split & pay", text: "Split the bill, add a tip, pay at the table." },
  { icon: Languages, title: "Hindi & English", text: "Big buttons and simple words for every staff member." },
  { icon: MessageCircle, title: "WhatsApp", text: "Bills to guests, daily sales to the owner." },
  { icon: Star, title: "More Google reviews", text: "Happy guests are nudged to review you." },
  { icon: Smartphone, title: "Works on any phone", text: "Install it like an app. No laptop needed." },
];

export default function Platform() {
  return (
    <div className="min-h-dvh bg-white">
      <section className="relative isolate overflow-hidden bg-zinc-950 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950/40 to-zinc-950" />
        <div className="mx-auto max-w-5xl px-5 pb-16 pt-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-extrabold">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white text-sm text-zinc-950">SD</span> Smart Dining
            </span>
            <Link href="/super/login" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10">
              <Crown className="size-3.5" /> Super admin
            </Link>
          </div>
          <h1 className="mt-16 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Your restaurant, on every table.</h1>
          <p className="mt-4 max-w-xl text-lg text-white/75">QR menus, a kitchen screen, live table tracking and pay-at-table. Set up in minutes from your existing menu PDF.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/r/${DEMO_SLUG}`} className="flex h-12 items-center gap-2 rounded-2xl bg-white px-5 font-bold text-zinc-950">
              Try as a guest
            </Link>
            <Link href={`/r/${DEMO_SLUG}/login`} className="flex h-12 items-center gap-2 rounded-2xl border border-white/30 px-5 font-bold">
              Try the staff app
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-2xl font-extrabold tracking-tight">Everything a busy floor needs</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl bg-slate-50 p-5">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                <Icon className="size-5" />
              </span>
              <div className="mt-3 font-extrabold">{title}</div>
              <div className="mt-1 text-sm text-slate-500">{text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="flex flex-col gap-4 rounded-[2rem] bg-brand-600 p-7 text-white sm:flex-row sm:items-center">
          <BellRing className="size-10 shrink-0" />
          <div className="flex-1">
            <div className="text-xl font-extrabold">See it live in 30 seconds</div>
            <div className="text-white/85">Open the demo restaurant on your phone and order something.</div>
          </div>
          <Link href={`/r/${DEMO_SLUG}/t/5`} className="flex h-12 items-center justify-center rounded-2xl bg-white px-5 font-bold text-brand-700">
            Open Table 5
          </Link>
        </div>
      </section>
    </div>
  );
}
