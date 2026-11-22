import type { StaffRole } from "./types";

/**
 * Minimal staff session: an HMAC-signed, httpOnly cookie holding { role, exp }.
 * Uses Web Crypto so it works in both the proxy and Node route handlers.
 */
export const SESSION_COOKIE = "sr_session";
export const SESSION_HOURS = 12;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const DEV_SECRET = "dev-only-secret-change-me";
const isProd = () => process.env.NODE_ENV === "production";

export function authSecret(): string | null {
  return process.env.AUTH_SECRET || (isProd() ? null : DEV_SECRET);
}

/** PIN for a role. In development, defaults are 1234 (admin) and 0000 (waiter). */
export function rolePin(role: StaffRole): string | null {
  const v = role === "admin" ? process.env.ADMIN_PIN : process.env.WAITER_PIN;
  if (v) return v;
  return isProd() ? null : role === "admin" ? "1234" : "0000";
}

async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(role: StaffRole): Promise<string | null> {
  const secret = authSecret();
  if (!secret) return null;
  const payload = b64url(enc.encode(JSON.stringify({ role, exp: Date.now() + SESSION_HOURS * 3600_000 })));
  const sig = await crypto.subtle.sign("HMAC", await key(secret), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<StaffRole | null> {
  const secret = authSecret();
  if (!token || !secret) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { role?: string; exp?: number };
    if (!data.exp || data.exp < Date.now()) return null;
    return data.role === "admin" || data.role === "waiter" ? data.role : null;
  } catch {
    return null;
  }
}

/** Constant-time-ish string compare for PINs. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const canAccess = (role: StaffRole | null, need: StaffRole) => role === "admin" || (need === "waiter" && role === "waiter");
