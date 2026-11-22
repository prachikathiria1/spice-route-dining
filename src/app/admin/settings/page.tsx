"use client";

import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { StaffShell } from "@/components/staff/StaffShell";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { getSettings } from "@/lib/selectors";

const input = "h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100";

export default function SettingsPage() {
  return <StaffShell title="Settings">{() => <SettingsForm />}</StaffShell>;
}

function SettingsForm() {
  const { state, actions, mode } = useStore();
  const toast = useToast();
  const s = getSettings(state!);
  const [form, setForm] = useState({ restaurantName: s.restaurantName, tagline: s.tagline, wifiSsid: s.wifiSsid, wifiPassword: s.wifiPassword, taxPct: String(Math.round(s.taxRate * 1000) / 10) });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid max-w-4xl gap-6">
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80">
        <h2 className="font-bold">Restaurant</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input className={input} value={form.restaurantName} onChange={set("restaurantName")} /></Field>
          <Field label="Tagline"><input className={input} value={form.tagline} onChange={set("tagline")} /></Field>
          <Field label="Guest Wi-Fi network"><input className={input} value={form.wifiSsid} onChange={set("wifiSsid")} /></Field>
          <Field label="Guest Wi-Fi password"><input className={input} value={form.wifiPassword} onChange={set("wifiPassword")} /></Field>
          <Field label="GST %"><input className={input} type="number" min={0} step="0.5" value={form.taxPct} onChange={set("taxPct")} /></Field>
        </div>
        <Button
          className="mt-5 bg-zinc-900 hover:bg-black"
          onClick={() => {
            actions.updateSettings({
              restaurantName: form.restaurantName.trim() || s.restaurantName,
              tagline: form.tagline.trim(),
              wifiSsid: form.wifiSsid,
              wifiPassword: form.wifiPassword,
              taxRate: Math.max(0, Number(form.taxPct) || 0) / 100,
            });
            toast("Settings saved");
          }}
        >
          <Save className="size-4" /> Save
        </Button>
      </section>

      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80">
        <h2 className="font-bold">Staff access</h2>
        <p className="mt-1 text-sm text-slate-500">
          Admin and Waiter PINs are set on the server with the <code className="rounded bg-slate-100 px-1">ADMIN_PIN</code> and <code className="rounded bg-slate-100 px-1">WAITER_PIN</code> environment variables. Change them in your hosting dashboard, then redeploy.
        </p>
      </section>

      <section className="rounded-3xl bg-white p-6 ring-1 ring-red-200">
        <h2 className="font-bold text-red-700">Demo data</h2>
        <p className="mt-1 text-sm text-slate-500">
          Replace all orders, payments, reviews and menu edits with the original sample data. {mode === "supabase" ? "This affects every device." : "This affects this browser only."}
        </p>
        <Button
          variant="secondary"
          className="mt-4 border-red-200 text-red-700 hover:bg-red-50"
          onClick={async () => {
            if (!confirm("Reset ALL data to the sample? This can't be undone.")) return;
            await actions.reset();
            toast("Demo data reset");
          }}
        >
          <RotateCcw className="size-4" /> Reset demo data
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
