"use client";

import type { DbState, MenuItem, Settings } from "../types";
import type { DataAdapter } from "./adapter";
import { createLocalAdapter, listLocalRestaurants, writeLocalRestaurant } from "./local-adapter";
import { supabaseEnv } from "./store";
import { createSupabaseAdapter, supabaseCreateRestaurant, supabaseListRestaurants } from "./supabase-adapter";

/** Super-admin data helpers that work across restaurants (Supabase or local mode). */
export function adapterFor(rid: string): DataAdapter {
  const env = supabaseEnv();
  return env ? createSupabaseAdapter(env.url, env.key, rid) : createLocalAdapter(rid);
}

export async function listRestaurants(): Promise<Settings[]> {
  const env = supabaseEnv();
  const list = env ? await supabaseListRestaurants(env.url, env.key) : listLocalRestaurants();
  return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function createRestaurant(rid: string, state: DbState): Promise<void> {
  const env = supabaseEnv();
  if (env) return supabaseCreateRestaurant(env.url, env.key, rid, state);
  if (listLocalRestaurants().some((r) => r.slug === rid)) throw new Error(`The address /r/${rid} is already taken.`);
  writeLocalRestaurant(rid, state);
}

export async function updateRestaurantSettings(rid: string, settings: Settings) {
  await adapterFor(rid).upsert("settings", [settings]);
}

export async function replaceRestaurantMenu(rid: string, items: MenuItem[]) {
  const a = adapterFor(rid);
  const cur = await a.load();
  const keep = new Set(items.map((i) => i.id));
  const drop = cur.menu_items.map((m) => m.id).filter((id) => !keep.has(id));
  if (drop.length) await a.remove("menu_items", drop);
  await a.upsert("menu_items", items);
}

export async function loadRestaurant(rid: string): Promise<DbState> {
  return adapterFor(rid).load();
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");

export async function savePins(rid: string, pins: { admin?: string; waiter?: string }) {
  const res = await fetch("/api/super/pins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rid, ...pins }) });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Could not save PINs");
}

export const randomPin = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
