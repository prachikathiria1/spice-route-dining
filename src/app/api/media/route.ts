import { NextResponse } from "next/server";
import { canAccess } from "@/lib/auth";
import { SLUG_RE } from "@/lib/data/adapter";
import { hasServiceStorage, uploadMedia } from "@/lib/server/storage";
import { currentSession } from "@/lib/session";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Upload a dish/hero photo for a restaurant (admin of that restaurant, or super admin). */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const rid = String(form?.get("rid") ?? "");
  const file = form?.get("file");
  if (!SLUG_RE.test(rid) || !(file instanceof File)) return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  if (!canAccess(await currentSession(), "admin", rid)) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  if (!hasServiceStorage()) return NextResponse.json({ ok: false, error: "Photo upload needs Supabase. Paste an image link instead." }, { status: 501 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ ok: false, error: "Use a JPG, PNG or WebP image" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Image is larger than 5 MB" }, { status: 400 });
  try {
    const url = await uploadMedia(`${rid}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`, await file.arrayBuffer(), file.type);
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("[media]", e);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
