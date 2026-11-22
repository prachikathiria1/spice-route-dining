import { NextResponse } from "next/server";
import { SLUG_RE } from "@/lib/data/adapter";
import { sessionResponse } from "@/lib/server/cookie";
import { verifyPin } from "@/lib/server/pins";
import { clearFailures, clientIp, recordFailure, throttled } from "@/lib/server/throttle";

export async function POST(req: Request) {
  let body: { rid?: string; role?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const { rid = "", role, pin = "" } = body;
  if (!SLUG_RE.test(rid)) return NextResponse.json({ ok: false, error: "Unknown restaurant" }, { status: 400 });
  if (role !== "admin" && role !== "waiter") return NextResponse.json({ ok: false, error: "Unknown role" }, { status: 400 });

  const key = `${clientIp(req)}|${rid}`;
  if (throttled(key)) return NextResponse.json({ ok: false, error: "Too many tries. Wait one minute." }, { status: 429 });

  let ok = false;
  try {
    ok = await verifyPin(rid, role, String(pin));
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json({ ok: false, error: "Login is unavailable right now" }, { status: 500 });
  }
  if (!ok) {
    recordFailure(key);
    return NextResponse.json({ ok: false, error: "Wrong PIN" }, { status: 401 });
  }
  clearFailures(key);
  return sessionResponse({ role, rid }, { role });
}
