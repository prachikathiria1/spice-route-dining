"use client";

import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Loader2, QrCode, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { MenuImporter, type ImportResult } from "@/components/super/MenuImporter";
import { ThemePreview } from "@/components/super/ThemePreview";
import { useToast } from "@/components/toast";
import { SLUG_RE } from "@/lib/data/adapter";
import { createRestaurant, randomPin, savePins, slugify } from "@/lib/data/platform";
import { detectCuisine, toMenuItems } from "@/lib/menu-import";
import { buildRestaurant } from "@/lib/seed";
import { THEME_IDS, THEMES } from "@/lib/themes";
import type { Lang, ThemeId } from "@/lib/types";
import { cn, copyText } from "@/lib/utils";

const input = "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100";
const STEPS = ["Details", "Menu", "Look & PINs"];

export default function NewRestaurant() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", slug: "", slugTouched: false, tagline: "", tables: "8", wifiSsid: "", wifiPassword: "", whatsapp: "", google: "", lang: "en" as Lang });
  const [menu, setMenu] = useState<ImportResult>({ items: [], cuisine: "" });
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [pins, setPins] = useState({ admin: randomPin(), waiter: randomPin() });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ slug: string } | null>(null);

  const slug = f.slugTouched ? f.slug : slugify(f.name);
  const menuItems = useMemo(() => toMenuItems(menu.items), [menu.items]);
  const suggested = useMemo(() => detectCuisine(menu.items), [menu.items]);
  const activeTheme = theme ?? suggested.theme;
  const onMenu = useCallback((r: ImportResult) => setMenu(r), []);

  const step0ok = f.name.trim().length >= 2 && SLUG_RE.test(slug) && Number(f.tables) >= 1;

  async function create() {
    if (pins.admin === pins.waiter) return toast("Manager and waiter PINs must be different", "error");
    setBusy(true);
    try {
      const state = buildRestaurant({
        slug,
        restaurantName: f.name.trim(),
        tagline: f.tagline.trim(),
        cuisine: menu.cuisine || suggested.cuisine,
        theme: activeTheme,
        tableCount: Number(f.tables),
        wifiSsid: f.wifiSsid,
        wifiPassword: f.wifiPassword,
        whatsappNumber: f.whatsapp.replace(/\D/g, "") || undefined,
        googleReviewUrl: /^https?:\/\//.test(f.google.trim()) ? f.google.trim() : undefined,
        defaultLanguage: f.lang,
        menu: menuItems,
      });
      await createRestaurant(slug, state);
      await savePins(slug, pins);
      setDone({ slug });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create the restaurant", "error");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Created slug={done.slug} name={f.name} pins={pins} />;

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center gap-2">
        <Link href="/super" className="flex size-10 items-center justify-center rounded-full hover:bg-white" aria-label="Back">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">New restaurant</h1>
      </div>

      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("rounded-2xl px-3 py-2 text-center text-sm font-bold", i === step ? "bg-zinc-900 text-white" : i < step ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-400 ring-1 ring-slate-200")}>
            {i < step ? <Check className="mr-1 inline size-4" /> : `${i + 1}. `}
            {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
          <Field label="Restaurant name">
            <input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Sharma Dhaba" autoFocus />
          </Field>
          <Field label="Web address">
            <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 pl-3 focus-within:border-zinc-900">
              <span className="shrink-0 text-sm text-slate-500">/r/</span>
              <input className="h-12 min-w-0 flex-1 bg-transparent px-1 text-base outline-none" value={slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value), slugTouched: true })} aria-label="Address" />
            </div>
            {slug && !SLUG_RE.test(slug) && <span className="text-xs text-red-600">Use letters, numbers and dashes</span>}
          </Field>
          <Field label="Tagline (optional)">
            <input className={input} value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} placeholder="e.g. Since 1989 · Pure veg" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tables">
              <input className={input} type="number" min={1} max={100} value={f.tables} onChange={(e) => setF({ ...f, tables: e.target.value })} />
            </Field>
            <Field label="Staff language">
              <select className={input} value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value as Lang })}>
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </Field>
            <Field label="Wi-Fi name">
              <input className={input} value={f.wifiSsid} onChange={(e) => setF({ ...f, wifiSsid: e.target.value })} />
            </Field>
            <Field label="Wi-Fi password">
              <input className={input} value={f.wifiPassword} onChange={(e) => setF({ ...f, wifiPassword: e.target.value })} />
            </Field>
          </div>
          <Field label="Owner WhatsApp (daily sales summary)">
            <input className={input} inputMode="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="98765 43210" />
          </Field>
          <Field label="Google review link (optional)">
            <input className={input} value={f.google} onChange={(e) => setF({ ...f, google: e.target.value })} placeholder="https://g.page/r/…/review" />
          </Field>
        </section>
      )}

      {step === 1 && <MenuImporter onChange={onMenu} initial={menu.items} />}

      {step === 2 && (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
              <h2 className="font-bold">Theme</h2>
              <p className="text-sm text-slate-500">
                Suggested for <b>{menu.cuisine || suggested.cuisine}</b>: {THEMES[suggested.theme].label}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {THEME_IDS.map((id) => (
                  <button key={id} onClick={() => setTheme(id)} className={cn("flex items-center gap-2 rounded-2xl border-2 p-3 text-left", activeTheme === id ? "border-zinc-900" : "border-slate-200")}>
                    <span className="size-8 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${THEMES[id].palette[4]}, ${THEMES[id].palette[7]})` }} />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{THEMES[id].label}</span>
                      <span className="block truncate text-[11px] text-slate-500">{THEMES[id].fits}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-3 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Staff PINs</h2>
                <button onClick={() => setPins({ admin: randomPin(), waiter: randomPin() })} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
                  <RefreshCw className="size-4" /> New PINs
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Manager PIN">
                  <input className={cn(input, "font-mono tracking-widest")} inputMode="numeric" value={pins.admin} onChange={(e) => setPins({ ...pins, admin: e.target.value.replace(/\D/g, "").slice(0, 8) })} />
                </Field>
                <Field label="Waiter PIN">
                  <input className={cn(input, "font-mono tracking-widest")} inputMode="numeric" value={pins.waiter} onChange={(e) => setPins({ ...pins, waiter: e.target.value.replace(/\D/g, "").slice(0, 8) })} />
                </Field>
              </div>
              <p className="text-xs text-slate-500">4–8 digits. PINs are stored hashed on the server; only you can reset them.</p>
            </section>
          </div>
          <div>
            <p className="mb-2 text-center text-sm font-semibold text-slate-500">Customer preview</p>
            <ThemePreview name={f.name} tagline={f.tagline} theme={activeTheme} items={menuItems} />
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex h-14 items-center gap-1 rounded-2xl border border-slate-300 px-5 font-bold">
              <ArrowLeft className="size-5" /> Back
            </button>
          )}
          {step < 2 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 0 && !step0ok} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-lg font-bold text-white disabled:bg-slate-300">
              {step === 1 && !menu.items.length ? "Skip menu for now" : "Next"} <ArrowRight className="size-5" />
            </button>
          ) : (
            <button onClick={create} disabled={busy || pins.admin.length < 4 || pins.waiter.length < 4} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-lg font-bold text-white disabled:bg-slate-300">
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />} Create restaurant
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Created({ slug, name, pins }: { slug: string; name: string; pins: { admin: string; waiter: string } }) {
  const toast = useToast();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const handover = `${name} is live on Smart Dining\n\nCustomer page: ${origin}/r/${slug}\nStaff login: ${origin}/r/${slug}/login\nManager PIN: ${pins.admin}\nWaiter PIN: ${pins.waiter}\n\nPrint table QR codes: ${origin}/r/${slug}/admin/tables`;
  return (
    <div className="mx-auto max-w-lg space-y-5 py-6 text-center">
      <span className="mx-auto flex size-16 animate-pop items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="size-8" />
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight">{name} is live!</h1>
      <div className="space-y-2 rounded-3xl bg-white p-5 text-left ring-1 ring-slate-200">
        <Row label="Customer page" value={`/r/${slug}`} />
        <Row label="Staff login" value={`/r/${slug}/login`} />
        <Row label="Manager PIN" value={pins.admin} mono />
        <Row label="Waiter PIN" value={pins.waiter} mono />
      </div>
      <p className="text-sm text-slate-500">Save these PINs now. They're stored hashed and can't be shown again (you can reset them anytime).</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button onClick={async () => (await copyText(handover)) && toast("Copied: paste it to the owner on WhatsApp")} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-900 font-bold text-white">
          <Copy className="size-4" /> Copy handover message
        </button>
        <Link href={`/r/${slug}/admin/tables`} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 font-bold">
          <QrCode className="size-4" /> Print QR codes
        </Link>
        <Link href={`/r/${slug}`} target="_blank" className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 font-bold">
          <ExternalLink className="size-4" /> Open customer page
        </Link>
        <Link href="/super" className="flex h-12 items-center justify-center rounded-2xl border border-slate-300 font-bold">
          All restaurants
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={cn("font-bold", mono && "font-mono text-lg tracking-widest")}>{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
