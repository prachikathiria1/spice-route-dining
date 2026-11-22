import { NextResponse } from "next/server";
import { safeEqual, superPassword } from "@/lib/auth";
import { sessionResponse } from "@/lib/server/cookie";
import { clearFailures, clientIp, recordFailure, throttled } from "@/lib/server/throttle";

export async function POST(req: Request) {
  const key = `super|${clientIp(req)}`;
  if (throttled(key)) return NextResponse.json({ ok: false, error: "Too many tries. Wait one minute." }, { status: 429 });
  const expected = superPassword();
  if (!expected) return NextResponse.json({ ok: false, error: "SUPER_ADMIN_PASSWORD is not configured" }, { status: 500 });
  let password = "";
  try {
    password = String(((await req.json()) as { password?: string }).password ?? "");
  } catch {
    /* empty */
  }
  if (!safeEqual(password, expected)) {
    recordFailure(key, 5);
    return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
  }
  clearFailures(key);
  return sessionResponse({ role: "super" });
}
