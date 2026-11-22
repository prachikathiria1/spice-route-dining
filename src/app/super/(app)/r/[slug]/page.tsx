"use client";

import { ArrowLeft, ExternalLink, KeyRound, LayoutDashboard, Loader2, Pause, Play, QrCode, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MenuImporter, type ImportResult } from "@/components/super/MenuImporter";
import { ThemePreview } from "@/components/super/ThemePreview";
import { useToast } from "@/components/toast";
import { loadRestaurant, randomPin, replaceRestaurantMenu, savePins, updateRestaurantSettings } from "@/lib/data/platform";
import { detectCuisine, toMenuItems } from "@/lib/menu-import";
import { THEME_IDS, THEMES } from "@/lib/themes";
import type { DbState, ThemeId } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ManageRestaurant() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();
  const [state, setState] = useState<DbState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [menu, setMenu] = useState<ImportResult>({ items: [], cuisine: "" });
  const [newPins, setNewPins] = useState<{ admin: string; waiter: string } | null>(null);
  const [pinStatus, setPinStatus] = useState<{ admin: boolean; waiter: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const onMenu = useCallback((r: ImportResult) => setMenu(r), []);

  const reload = useCallback(() => loadRestaurant(slug).then(setState).catch((e) => setError(e instanceof Error ? e.message : String(e))), [slug]);
  useEffect(() => {
    reload();
    fetch(`/api/super/pins?rid=${slug}`).then((r) => r.json()).then((d) => d.ok && setPinStatus(d)).catch(() => {});
  }, [reload, slug]);

  const s = state?.settings[0];
  const imported = useMemo(() => (state ? toMenuItems(menu.items, state.menu_items) : []), [menu.items, state]);

  if (error) return <p className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!state || !s)
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );

  const save = async (patch: Partial<typeof s>) => {
    await updateRestaurantSettings(slug, { ...s, ...patch });
    await reload();
    toast("Saved");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/super" className="flex size-10 items-center justify-center rounded-full hover:bg-white" aria-label="Back">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{s.restaurantName}</h1>
          <p className="text-sm text-slate-500">
            /r/{slug} · {state.menu_items.length} dishes · {state.restaurant_tables.length} tables
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickLink href={`/r/${slug}`} icon={ExternalLink} label="Customer page" />
        <QuickLink href={`/r/${slug}/admin`} icon={LayoutDashboard} label="Manager view" />
        <QuickLink href={`/r/${slug}/admin/tables`} icon={QrCode} label="QR codes" />
        <button onClick={() => save({ active: s.active === false })} className={cn("flex h-14 items-center justify-center gap-2 rounded-2xl text-sm font-bold", s.active === false ? "bg-emerald-600 text-white" : "bg-white ring-1 ring-slate-200")}>
          {s.active === false ? <Play className="size-4" /> : <Pause className="size-4" />} {s.active === false ? "Resume" : "Pause"}
        </button>
      </div>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-bold">Theme</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {THEME_IDS.map((id) => (
            <button key={id} onClick={() => save({ theme: id as ThemeId })} className={cn("flex h-10 items-center gap-2 rounded-full border-2 pl-1 pr-3 text-sm font-bold", (s.theme ?? "saffron") === id ? "border-zinc-900" : "border-slate-200")}>
              <span className="size-7 rounded-full" style={{ background: `linear-gradient(135deg, ${THEMES[id].palette[4]}, ${THEMES[id].palette[7]})` }} />
              {THEMES[id].label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold">Staff PINs</h2>
            <p className="text-sm text-slate-500">
              {pinStatus ? `Manager: ${pinStatus.admin ? "set" : "not set"} · Waiter: ${pinStatus.waiter ? "set" : "not set"}` : "…"}
            </p>
          </div>
          <button onClick={() => setNewPins({ admin: randomPin(), waiter: randomPin() })} className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold">
            <KeyRound className="size-4" /> Reset PINs
          </button>
        </div>
        {newPins && (
          <div className="mt-4 space-y-3 rounded-2xl bg-amber-50 p-4">
            <div className="grid grid-cols-2 gap-3">
              {(["admin", "waiter"] as const).map((r) => (
                <label key={r} className="block space-y-1">
                  <span className="text-sm font-medium text-slate-600">{r === "admin" ? "Manager" : "Waiter"} PIN</span>
                  <input value={newPins[r]} onChange={(e) => setNewPins({ ...newPins, [r]: e.target.value.replace(/\D/g, "").slice(0, 8) })} inputMode="numeric" className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-lg tracking-widest" />
                </label>
              ))}
            </div>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await savePins(slug, newPins);
                  setPinStatus({ admin: true, waiter: true });
                  toast(`Saved. Manager ${newPins.admin} · Waiter ${newPins.waiter}`);
                  setNewPins(null);
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Failed", "error");
                } finally {
                  setBusy(false);
                }
              }}
              className="h-12 w-full rounded-xl bg-zinc-900 font-bold text-white"
            >
              Save new PINs
            </button>
            <p className="text-xs text-amber-900">Write them down before saving. Staff already signed in stay signed in until their session ends (12 hours).</p>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold">Menu</h2>
            <p className="text-sm text-slate-500">Re-import from a new PDF/photos. Dishes with the same name keep their photos, stock status and settings.</p>
          </div>
          {!importing && (
            <button onClick={() => setImporting(true)} className="flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white">
              <Upload className="size-4" /> Import menu
            </button>
          )}
        </div>
        {importing && (
          <>
            <MenuImporter onChange={onMenu} />
            {imported.length > 0 && (
              <div className="grid gap-4 md:grid-cols-[1fr_300px]">
                <div className="space-y-2 self-end">
                  <button
                    disabled={busy}
                    onClick={async () => {
                      if (!confirm(`Replace the current menu (${state.menu_items.length} dishes) with ${imported.length} imported dishes?`)) return;
                      setBusy(true);
                      try {
                        await replaceRestaurantMenu(slug, imported);
                        if (!s.cuisine) await updateRestaurantSettings(slug, { ...s, cuisine: menu.cuisine || detectCuisine(menu.items).cuisine });
                        await reload();
                        setImporting(false);
                        toast(`Menu updated: ${imported.length} dishes`);
                      } catch (e) {
                        toast(e instanceof Error ? e.message : "Failed", "error");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-lg font-bold text-white"
                  >
                    {busy && <Loader2 className="size-5 animate-spin" />} Replace menu with {imported.length} dishes
                  </button>
                  <button onClick={() => setImporting(false)} className="h-12 w-full rounded-2xl border border-slate-300 font-bold">
                    Cancel
                  </button>
                </div>
                <ThemePreview name={s.restaurantName} tagline={s.tagline} theme={s.theme ?? "saffron"} items={imported} />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof QrCode; label: string }) {
  return (
    <Link href={href} target={href.endsWith(`/admin`) ? undefined : "_blank"} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold ring-1 ring-slate-200">
      <Icon className="size-4" /> {label}
    </Link>
  );
}
