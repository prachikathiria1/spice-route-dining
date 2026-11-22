"use client";

import { Check, Link2, Mail, Printer, Star } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useStore } from "@/lib/data/store";
import { getSettings } from "@/lib/selectors";
import type { Payment } from "@/lib/types";
import { cn, copyText, formatINR } from "@/lib/utils";

const REVIEW_TAGS = ["Great food", "Fast service", "Friendly staff", "Ambience", "Value for money", "Slow service"];

export function ReceiptView({ payment, showReview = true }: { payment: Payment; showReview?: boolean }) {
  const { state } = useStore();
  const settings = state ? getSettings(state) : null;
  const date = new Date(payment.paidAt);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden print:border-0 print:shadow-none">
        <div className="bg-slate-900 px-5 py-5 text-center text-white">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-300">Digital receipt · Demo</div>
          <div className="mt-1 text-2xl font-black">{settings?.restaurantName ?? "Spice Route"}</div>
          <div className="text-sm text-slate-300">
            {payment.receiptNo} · Table {payment.tableId.slice(1)} · {date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>
        <ul className="divide-y divide-dashed divide-slate-200 px-5">
          {payment.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3 py-2 text-sm">
              <span>
                {l.qty}× {l.name}
                {l.sizeLabel && <span className="text-slate-500"> ({l.sizeLabel})</span>}
              </span>
              <span className="tabular">{formatINR(l.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-slate-200 px-5 py-3 text-sm">
          <Line label="Subtotal" v={payment.subtotal} />
          <Line label="GST" v={payment.tax} />
          <Line label={`Tip (${payment.tipPercent}%)`} v={payment.tip} />
          <div className="flex justify-between pt-1 text-lg font-black">
            <span>Total paid</span>
            <span className="tabular">{formatINR(payment.total)}</span>
          </div>
        </div>
        <div className="border-t border-slate-200 px-5 py-3 text-sm">
          <div className="mb-1 font-semibold">{payment.splitWays > 1 ? `Split ${payment.splitWays} ways` : "Payment"}</div>
          {payment.shares.map((s) => (
            <div key={s.index} className="flex justify-between text-slate-600">
              <span>
                {payment.splitWays > 1 ? `Guest ${s.index + 1}` : "Paid"} · {s.method} · <span className="font-mono text-xs">{s.reference}</span>
              </span>
              <span className="tabular">{formatINR(s.amount)}</span>
            </div>
          ))}
        </div>
        <div className="bg-brand-50 px-5 py-3 text-center text-sm font-semibold text-brand-900">⭐ {payment.pointsEarned} reward points earned on this visit</div>
      </Card>

      <ReceiptActions payment={payment} />
      {showReview && <QuickReview payment={payment} />}
    </div>
  );
}

function Line({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="tabular">{formatINR(v)}</span>
    </div>
  );
}

function ReceiptActions({ payment }: { payment: Payment }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState(payment.receiptEmail ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(!!payment.receiptEmail);
  const receiptUrl = typeof window !== "undefined" ? `${window.location.origin}/receipt/${payment.id}` : "";

  async function send() {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast("Enter a valid email address", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, payment, restaurantName: state?.settings[0]?.restaurantName, receiptUrl }),
      });
      const data = (await res.json()) as { ok: boolean; fallback?: boolean; error?: string };
      actions.updatePaymentEmail(payment.id, email);
      if (data.ok) {
        toast(`Receipt emailed to ${email}`);
        setSent(true);
      } else if (data.fallback) {
        toast("Email isn't set up on this demo. Your digital receipt is saved here and at the link.", "info");
        setSent(true);
      } else toast(data.error ?? "Couldn't send the email", "error");
    } catch {
      toast("Network error. Your digital receipt is still saved here.", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="no-print space-y-3 p-4">
      <div className="text-sm font-bold">Get your receipt</div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address for receipt"
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
        />
        <Button onClick={send} loading={sending} variant={sent ? "success" : "primary"}>
          {sent ? <Check className="size-4" /> : <Mail className="size-4" />} {sent ? "Sent" : "Email"}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
          <Printer className="size-4" /> Print / PDF
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={async () => {
            if (await copyText(receiptUrl)) toast("Receipt link copied");
          }}
        >
          <Link2 className="size-4" /> Copy link
        </Button>
      </div>
    </Card>
  );
}

function QuickReview({ payment }: { payment: Payment }) {
  const { state, actions } = useStore();
  const existing = state?.reviews.find((r) => r.paymentId === payment.id);
  const [tags, setTags] = useState<string[]>([]);
  const [hover, setHover] = useState(0);

  if (existing)
    return (
      <Card className="no-print p-5 text-center">
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={cn("size-7", n <= existing.rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          ))}
        </div>
        <div className="mt-2 font-bold">Thanks for the feedback!</div>
        <div className="text-sm text-slate-500">See you again soon.</div>
      </Card>
    );

  return (
    <Card className="no-print space-y-3 p-5 text-center">
      <div className="font-black">How was your meal?</div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {REVIEW_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTags((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]))}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold", tags.includes(t) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-700")}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onClick={() => actions.addReview({ paymentId: payment.id, tableId: payment.tableId, rating: n, tags })}
            aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
            className="p-1 transition active:scale-90"
          >
            <Star className={cn("size-10", n <= hover ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          </button>
        ))}
      </div>
      <div className="text-xs text-slate-500">Tap a star to submit. Picking tags is optional.</div>
    </Card>
  );
}
