"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { QrTableCard } from "@/components/QrTableCard";
import { StaffShell } from "@/components/staff/StaffShell";
import { Button } from "@/components/ui";
import { useBaseUrl } from "@/hooks/useBaseUrl";
import { useStore } from "@/lib/data/store";
import { getSettings, sortedTables } from "@/lib/selectors";

const KEY = "spice-route:qr-base";

export default function QrPage() {
  return (
    <StaffShell
      title="Tables and QR codes" subtitle="Print and place one QR code on each table"
      actions={
        <Button variant="dark" onClick={() => window.print()} className="no-print">
          <Printer className="size-4" /> Print all
        </Button>
      }
    >
      {() => <QrGrid />}
    </StaffShell>
  );
}

function QrGrid() {
  const { state } = useStore();
  const detected = useBaseUrl();
  const [base, setBase] = useState("");

  useEffect(() => {
    try {
      setBase(localStorage.getItem(KEY) || detected);
    } catch {
      setBase(detected);
    }
  }, [detected]);

  const isLocalhost = /localhost|127\.0\.0\.1/.test(base);
  const settings = getSettings(state!);

  return (
    <div className="space-y-4">
      <div className="no-print space-y-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <label htmlFor="qr-base" className="text-sm font-bold">
          Base URL encoded in the QR codes
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="qr-base"
            value={base}
            onChange={(e) => {
              setBase(e.target.value);
              try {
                localStorage.setItem(KEY, e.target.value);
              } catch {
                /* ignore */
              }
            }}
            className="h-11 min-w-64 flex-1 rounded-xl border border-slate-300 px-3 font-mono text-sm"
            placeholder="https://your-app.vercel.app"
          />
          <Button variant="secondary" onClick={() => { setBase(detected); try { localStorage.removeItem(KEY); } catch { /* ignore */ } }}>
            Reset
          </Button>
        </div>
        {isLocalhost && (
          <p className="text-sm text-amber-800">
            Phones can&apos;t open <code>localhost</code>. Use your computer&apos;s LAN address (run <code>npm run dev:lan</code>, then e.g. <code>http://192.168.1.20:3000</code>) or your deployed URL.
            Cross-device ordering also needs Supabase configured.
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
        {sortedTables(state!).map((t) => (
          <QrTableCard key={t.id} tableId={t.id} label={t.label} baseUrl={base || detected} restaurantName={settings.restaurantName} />
        ))}
      </div>
    </div>
  );
}
