import { NextResponse } from "next/server";
import type { Payment } from "@/lib/types";

export const runtime = "nodejs";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function renderHtml(p: Payment, restaurant: string, url?: string) {
  const rows = p.lines
    .map((l) => `<tr><td style="padding:4px 0">${l.qty}× ${esc(l.name)}${l.sizeLabel ? ` (${esc(l.sizeLabel)})` : ""}</td><td align="right">${inr(l.amount)}</td></tr>`)
    .join("");
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#0f172a;color:#fff;padding:20px;text-align:center">
      <div style="font-size:11px;letter-spacing:2px;color:#fdba74">DIGITAL RECEIPT · DEMO</div>
      <div style="font-size:22px;font-weight:800">${esc(restaurant)}</div>
      <div style="font-size:13px;color:#cbd5e1">${esc(p.receiptNo)} · Table ${esc(p.tableId.slice(1))} · ${new Date(p.paidAt).toLocaleString("en-IN")}</div>
    </div>
    <table width="100%" style="padding:16px 20px;font-size:14px">${rows}
      <tr><td colspan="2"><hr style="border:none;border-top:1px dashed #cbd5e1"/></td></tr>
      <tr><td>Subtotal</td><td align="right">${inr(p.subtotal)}</td></tr>
      <tr><td>GST</td><td align="right">${inr(p.tax)}</td></tr>
      <tr><td>Tip (${esc(p.tipPercent)}%)</td><td align="right">${inr(p.tip)}</td></tr>
      <tr><td style="font-weight:800;font-size:18px;padding-top:8px">Total</td><td align="right" style="font-weight:800;font-size:18px;padding-top:8px">${inr(p.total)}</td></tr>
    </table>
    <div style="padding:0 20px 16px;font-size:13px;color:#475569">${p.shares.map((s) => `${p.splitWays > 1 ? `Guest ${s.index + 1}` : "Paid"} · ${esc(s.method)} · ${inr(s.amount)}`).join("<br/>")}</div>
    <div style="background:#fff7ed;color:#7c2d12;padding:12px 20px;text-align:center;font-size:13px;font-weight:600">⭐ ${esc(p.pointsEarned)} reward points earned</div>
    ${url ? `<div style="padding:16px 20px;text-align:center"><a href="${esc(url)}" style="color:#c2410c;font-weight:600">View receipt online</a></div>` : ""}
    <div style="padding:0 20px 16px;text-align:center;font-size:11px;color:#94a3b8">Demo transaction. No money was charged.</div>
  </div></body></html>`;
}

export async function POST(req: Request) {
  let body: { to?: string; payment?: Payment; restaurantName?: string; receiptUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { to, payment, restaurantName = "Spice Route", receiptUrl } = body;
  if (!to || !/^\S+@\S+\.\S+$/.test(to) || to.length > 200) return NextResponse.json({ ok: false, error: "Invalid email address" }, { status: 400 });
  if (!payment || !Array.isArray(payment.lines) || payment.lines.length > 200) return NextResponse.json({ ok: false, error: "Missing receipt" }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Free fallback: the in-app digital receipt is the receipt.
    return NextResponse.json({ ok: false, fallback: true, reason: "RESEND_API_KEY not configured" });
  }

  const from = process.env.RECEIPT_FROM_EMAIL || `${restaurantName} <onboarding@resend.dev>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Your receipt from ${restaurantName} · ${payment.receiptNo}`,
        html: renderHtml(payment, restaurantName, receiptUrl),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[receipt] Resend error", res.status, text);
      return NextResponse.json({ ok: false, fallback: true, error: `Email provider error (${res.status})` });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[receipt]", e);
    return NextResponse.json({ ok: false, fallback: true, error: "Email provider unreachable" });
  }
}
