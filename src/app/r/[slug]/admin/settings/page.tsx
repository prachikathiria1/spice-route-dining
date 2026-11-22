"use client";

import { Check, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { useStaffRole } from "@/components/role";
import { StaffShell } from "@/components/staff/StaffShell";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { getSettings } from "@/lib/selectors";
import { THEME_IDS, THEMES } from "@/lib/themes";
import type { Lang, ThemeId } from "@/lib/types";
import { cn } from "@/lib/utils";

const input = "h-12 w-full rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100";

export default function SettingsPage() {
  return <StaffShell title="Settings">{() => <SettingsForm />}</StaffShell>;
}

function SettingsForm() {
  const { state, actions, mode } = useStore();
  const role = useStaffRole();
  const toast = useToast();
  const s = getSettings(state!);
  const [form, setForm] = useState({
    restaurantName: s.restaurantName,
    tagline: s.tagline,
    wifiSsid: s.wifiSsid,
    wifiPassword: s.wifiPassword,
    taxPct: String(Math.round(s.taxRate * 1000) / 10),
    whatsappNumber: s.whatsappNumber ?? "",
    googleReviewUrl: s.googleReviewUrl ?? "",
    theme: (s.theme ?? "saffron") as ThemeId,
    defaultLanguage: (s.defaultLanguage ?? "en") as Lang,
    tables: String(state!.restaurant_tables.length),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function save() {
    const tables = Math.max(1, Math.min(100, Number(form.tables) || state!.restaurant_tables.length));
    actions.updateSettings({
      restaurantName: form.restaurantName.trim() || s.restaurantName,
      tagline: form.tagline.trim(),
      wifiSsid: form.wifiSsid,
      wifiPassword: form.wifiPassword,
      taxRate: Math.max(0, Number(form.taxPct) || 0) / 100,
      whatsappNumber: form.whatsappNumber.replace(/\D/g, "") || undefined,
      googleReviewUrl: /^https?:\/\//.test(form.googleReviewUrl.trim()) ? form.googleReviewUrl.trim() : undefined,
      theme: form.theme,
      defaultLanguage: form.defaultLanguage,
    });
    if (tables !== state!.restaurant_tables.length) actions.setTableCount(tables);
    toast("Saved");
  }

  return (
    <div className="grid max-w-4xl gap-5">
      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/80">
        <h2 className="font-bold">Restaurant</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input className={input} value={form.restaurantName} onChange={set("restaurantName")} /></Field>
          <Field label="Tagline"><input className={input} value={form.tagline} onChange={set("tagline")} placeholder="e.g. Home-style North Indian" /></Field>
          <Field label="Number of tables"><input className={input} type="number" min={1} max={100} value={form.tables} onChange={set("tables")} /></Field>
          <Field label="GST %"><input className={input} type="number" min={0} step="0.5" value={form.taxPct} onChange={set("taxPct")} /></Field>
          <Field label="Guest Wi-Fi name"><input className={input} value={form.wifiSsid} onChange={set("wifiSsid")} /></Field>
          <Field label="Guest Wi-Fi password"><input className={input} value={form.wifiPassword} onChange={set("wifiPassword")} /></Field>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/80">
        <h2 className="font-bold">Look &amp; language</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEME_IDS.map((id) => (
            <button key={id} onClick={() => setForm({ ...form, theme: id })} className={cn("flex items-center gap-2 rounded-2xl border-2 p-3 text-left", form.theme === id ? "border-zinc-900" : "border-slate-200")}>
              <span className="size-8 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${THEMES[id].palette[4]}, ${THEMES[id].palette[7]})` }} />
              <span className="min-w-0">
                <span className="block text-sm font-bold">{THEMES[id].label}</span>
                <span className="block truncate text-[11px] text-slate-500">{THEMES[id].fits}</span>
              </span>
              {form.theme === id && <Check className="ml-auto size-4 shrink-0" />}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <span className="text-sm font-medium text-slate-600">Staff screens open in</span>
          <div className="mt-1.5 flex gap-2">
            {(["en", "hi"] as const).map((l) => (
              <button key={l} onClick={() => setForm({ ...form, defaultLanguage: l })} className={cn("h-12 flex-1 rounded-xl border-2 font-bold sm:flex-none sm:px-6", form.defaultLanguage === l ? "border-zinc-900 bg-zinc-50" : "border-slate-200")}>
                {l === "en" ? "English" : "हिंदी"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/80">
        <h2 className="font-bold">Grow your business</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Owner WhatsApp number (for daily sales summary)"><input className={input} inputMode="tel" value={form.whatsappNumber} onChange={set("whatsappNumber")} placeholder="98765 43210" /></Field>
          <Field label="Google review link (happy guests are sent here)"><input className={input} value={form.googleReviewUrl} onChange={set("googleReviewUrl")} placeholder="https://g.page/r/…/review" /></Field>
        </div>
        <p className="mt-2 text-xs text-slate-500">Find your review link in Google Business Profile → “Ask for reviews”.</p>
      </section>

      <Button size="lg" className="bg-zinc-900 hover:bg-black sm:w-fit" onClick={save}>
        <Save className="size-5" /> Save settings
      </Button>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/80">
        <h2 className="font-bold">Staff PINs</h2>
        <p className="mt-1 text-sm text-slate-500">{role === "super" ? "Change PINs from the Super admin → restaurant page." : "Ask your platform admin to change Manager or Waiter PINs."}</p>
      </section>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-red-200">
        <h2 className="font-bold text-red-700">Start fresh</h2>
        <p className="mt-1 text-sm text-slate-500">Clears all orders, bills, calls and reviews. Your menu and settings stay. {mode === "supabase" ? "Affects every device." : "Affects this browser only."}</p>
        <Button
          variant="secondary"
          className="mt-4 border-red-200 text-red-700 hover:bg-red-50"
          onClick={async () => {
            if (!confirm("Clear all orders, bills and reviews? This can't be undone.")) return;
            await actions.reset();
            toast("Cleared");
          }}
        >
          <RotateCcw className="size-4" /> Clear activity
        </Button>
      </section>
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
