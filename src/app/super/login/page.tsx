"use client";

import { Crown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SuperLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 p-5">
      <form
        className="w-full max-w-sm space-y-5 rounded-[2rem] bg-white p-7 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const res = await fetch("/api/auth/super", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => null);
          const data = res ? ((await res.json()) as { ok: boolean; error?: string }) : { ok: false, error: "Network error" };
          setBusy(false);
          if (!data.ok) return setError(data.error ?? "Sign in failed");
          router.replace("/super");
          router.refresh();
        }}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-zinc-950">
          <Crown className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Super admin</h1>
          <p className="text-sm text-slate-500">Platform owner only. Manage every restaurant.</p>
        </div>
        <input type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100" />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        <button disabled={busy || !password} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-bold text-white disabled:bg-slate-300">
          {busy && <Loader2 className="size-4 animate-spin" />} Sign in
        </button>
      </form>
    </div>
  );
}
