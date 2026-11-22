import { NextResponse } from "next/server";
import { SLUG_RE } from "@/lib/data/adapter";
import { hasPins, setPins } from "@/lib/server/pins";
import { currentSession } from "@/lib/session";

const deny = () => NextResponse.json({ ok: false, error: "Super admin only" }, { status: 403 });

export async function GET(req: Request) {
  if ((await currentSession())?.role !== "super") return deny();
  const rid = new URL(req.url).searchParams.get("rid") ?? "";
  if (!SLUG_RE.test(rid)) return NextResponse.json({ ok: false, error: "Bad restaurant" }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await hasPins(rid)) });
}

export async function POST(req: Request) {
  if ((await currentSession())?.role !== "super") return deny();
  const body = (await req.json().catch(() => ({}))) as { rid?: string; admin?: string; waiter?: string };
  if (!body.rid || !SLUG_RE.test(body.rid)) return NextResponse.json({ ok: false, error: "Bad restaurant" }, { status: 400 });
  try {
    await setPins(body.rid, { admin: body.admin || undefined, waiter: body.waiter || undefined });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Could not save PINs" }, { status: 400 });
  }
}
