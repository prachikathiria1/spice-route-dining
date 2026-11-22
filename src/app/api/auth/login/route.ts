import { NextResponse } from "next/server";
import { rolePin, safeEqual, SESSION_COOKIE, SESSION_HOURS, signSession } from "@/lib/auth";
import type { StaffRole } from "@/lib/types";

// Simple in-memory throttle per instance (best effort on serverless).
const attempts = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) return NextResponse.json({ ok: false, error: "Too many attempts. Try again in a minute." }, { status: 429 });

  let body: { role?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const role = body.role as StaffRole;
  if (role !== "admin" && role !== "waiter") return NextResponse.json({ ok: false, error: "Unknown role" }, { status: 400 });

  const expected = rolePin(role);
  if (!expected) return NextResponse.json({ ok: false, error: "Staff PINs aren't configured on this server (set ADMIN_PIN, WAITER_PIN, AUTH_SECRET)." }, { status: 500 });

  if (!safeEqual(String(body.pin ?? ""), expected)) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    return NextResponse.json({ ok: false, error: "Incorrect PIN" }, { status: 401 });
  }
  attempts.delete(ip);

  const token = await signSession(role);
  if (!token) return NextResponse.json({ ok: false, error: "AUTH_SECRET is not configured" }, { status: 500 });
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
