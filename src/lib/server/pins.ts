import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEMO_SLUG } from "../seed";
import type { StaffRole } from "../types";
import { hasServiceStorage, readPrivateJson, writePrivateJson } from "./storage";

/**
 * Staff PINs per restaurant, stored as salted scrypt hashes where the public can't read them:
 * Supabase Storage private bucket (production) or .data/ (local dev without Supabase).
 */
interface PinRecord {
  salt: string;
  admin?: string;
  waiter?: string;
  updatedAt: number;
}

const DEV_FILE = path.join(process.cwd(), ".data", "staff-pins.json");

async function load(rid: string): Promise<PinRecord | null> {
  if (hasServiceStorage()) return readPrivateJson<PinRecord>(`staff/${rid}.json`);
  try {
    const all = JSON.parse(await readFile(DEV_FILE, "utf8")) as Record<string, PinRecord>;
    return all[rid] ?? null;
  } catch {
    return null;
  }
}

async function save(rid: string, rec: PinRecord) {
  if (hasServiceStorage()) return writePrivateJson(`staff/${rid}.json`, rec);
  if (process.env.NODE_ENV === "production") throw new Error("SUPABASE_SECRET_KEY is required to store staff PINs in production.");
  let all: Record<string, PinRecord> = {};
  try {
    all = JSON.parse(await readFile(DEV_FILE, "utf8"));
  } catch {
    /* new file */
  }
  all[rid] = rec;
  await mkdir(path.dirname(DEV_FILE), { recursive: true });
  await writeFile(DEV_FILE, JSON.stringify(all, null, 2));
}

const hash = (pin: string, salt: string) => scryptSync(pin, salt, 32).toString("hex");

export const PIN_RE = /^\d{4,8}$/;

export async function setPins(rid: string, pins: Partial<Record<StaffRole, string>>) {
  const cur = (await load(rid)) ?? { salt: randomBytes(16).toString("hex"), updatedAt: 0 };
  const next: PinRecord = { ...cur, updatedAt: Date.now() };
  for (const role of ["admin", "waiter"] as const) {
    const p = pins[role];
    if (p === undefined) continue;
    if (!PIN_RE.test(p)) throw new Error("PINs must be 4–8 digits");
    next[role] = hash(p, cur.salt);
  }
  if (next.admin && next.admin === next.waiter) throw new Error("Admin and waiter PINs must be different");
  await save(rid, next);
}

export async function hasPins(rid: string): Promise<{ admin: boolean; waiter: boolean }> {
  const rec = await load(rid);
  return { admin: !!rec?.admin, waiter: !!rec?.waiter };
}

export async function verifyPin(rid: string, role: StaffRole, pin: string): Promise<boolean> {
  const rec = await load(rid);
  const stored = rec?.[role];
  if (stored && rec) {
    const a = Buffer.from(hash(pin, rec.salt), "hex");
    const b = Buffer.from(stored, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }
  // Legacy fallback for the demo restaurant: env PINs (or dev defaults).
  if (rid !== DEMO_SLUG) return false;
  const envPin = role === "admin" ? process.env.ADMIN_PIN : process.env.WAITER_PIN;
  const expected = envPin || (process.env.NODE_ENV === "production" ? null : role === "admin" ? "1234" : "0000");
  return !!expected && expected.length === pin.length && timingSafeEqual(Buffer.from(expected), Buffer.from(pin));
}
