import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_HOURS, signSession, type Session } from "../auth";

export async function sessionResponse(session: Session, body: Record<string, unknown> = {}) {
  const token = await signSession(session);
  if (!token) return NextResponse.json({ ok: false, error: "AUTH_SECRET is not configured on the server" }, { status: 500 });
  const res = NextResponse.json({ ok: true, ...body });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_HOURS * 3600 });
  return res;
}
