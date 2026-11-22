import type { SessionRole, StaffRole } from "./types";

/**
 * Minimal session: an HMAC-signed, httpOnly cookie holding { role, rid, exp }.
 * - waiter/admin sessions belong to one restaurant (rid)
 * - super sessions (platform owner) can open every restaurant
 * Web Crypto only, so it runs in both the proxy and Node route handlers.
 */
export const SESSION_COOKIE = "sr_session";
export const SESSION_HOURS = 12;

export interface Session {
  role: SessionRole;
  rid?: string;
}

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const isProd = () => process.env.NODE_ENV === "production";

export function authSecret(): string | null {
  return process.env.AUTH_SECRET || (isProd() ? null : "dev-only-secret-change-me");
}

/** Super admin password. In development it defaults to "super-admin". */
export function superPassword(): string | null {
  return process.env.SUPER_ADMIN_PASSWORD || (isProd() ? null : "super-admin");
}

async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(session: Session): Promise<string | null> {
  const secret = authSecret();
  if (!secret) return null;
  const payload = b64url(enc.encode(JSON.stringify({ ...session, exp: Date.now() + SESSION_HOURS * 3600_000 })));
  const sig = await crypto.subtle.sign("HMAC", await key(secret), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  const secret = authSecret();
  if (!token || !secret) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const d = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { role?: string; rid?: string; exp?: number };
    if (!d.exp || d.exp < Date.now()) return null;
    if (d.role === "super") return { role: "super" };
    if ((d.role === "admin" || d.role === "waiter") && d.rid) return { role: d.role, rid: d.rid };
    return null;
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Effective role of a session inside restaurant `rid` (super acts as admin everywhere). */
export function roleIn(session: Session | null, rid: string): SessionRole | null {
  if (!session) return null;
  if (session.role === "super") return "super";
  return session.rid === rid ? session.role : null;
}

export function canAccess(session: Session | null, need: StaffRole, rid: string): boolean {
  const r = roleIn(session, rid);
  return r === "super" || r === "admin" || (need === "waiter" && r === "waiter");
}
