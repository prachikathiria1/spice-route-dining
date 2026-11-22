"use client";

import { Banknote, Building2, CheckCircle2, CreditCard, FlaskConical, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Sheet } from "@/components/ui";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

const ICONS: Record<PaymentMethod, typeof Banknote> = {
  Cash: Banknote,
  "Bank transfer": Building2,
  Card: CreditCard,
  "Apple Pay": Smartphone,
  "Google Pay": Smartphone,
};

export function DemoBanner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900", className)}>
      <FlaskConical className="size-4 shrink-0" /> DEMO / TEST MODE: no real money moves and no card details are stored.
    </div>
  );
}

/** Simulated checkout for one share of the bill. */
export function PaymentSheet({
  open,
  amount,
  label,
  onClose,
  onPaid,
}: {
  open: boolean;
  amount: number;
  label: string;
  onClose: () => void;
  onPaid: (method: PaymentMethod, reference: string) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("Google Pay");
  const [stage, setStage] = useState<"choose" | "processing" | "success">("choose");
  const [card, setCard] = useState({ number: "4242 4242 4242 4242", expiry: "12/30", cvc: "123", name: "" });

  useEffect(() => {
    if (open) setStage("choose");
  }, [open]);

  function pay() {
    setStage("processing");
    const reference = `DEMO-${method.replace(/\s/g, "").slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setTimeout(() => {
      setStage("success");
      setTimeout(() => onPaid(method, reference), 900);
    }, method === "Cash" ? 600 : 1500);
  }

  const cta: Record<PaymentMethod, string> = {
    Cash: `Confirm cash ${formatINR(amount)} handed to waiter`,
    "Bank transfer": "I've made the transfer",
    Card: `Pay ${formatINR(amount)}`,
    "Apple Pay": `Pay ${formatINR(amount)} with Apple Pay`,
    "Google Pay": `Pay ${formatINR(amount)} with Google Pay`,
  };

  return (
    <Sheet
      open={open}
      onClose={stage === "processing" ? () => {} : onClose}
      title={`Pay ${label}`}
      footer={
        stage === "choose" ? (
          <Button size="lg" className={cn("w-full", (method === "Apple Pay" || method === "Google Pay") && "bg-black hover:bg-slate-800")} onClick={pay}>
            {cta[method]}
          </Button>
        ) : undefined
      }
    >
      {stage === "choose" && (
        <div className="space-y-4 p-5">
          <DemoBanner />
          <div className="text-center">
            <div className="text-sm text-slate-500">Amount due</div>
            <div className="text-4xl font-black tabular">{formatINR(amount)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
            {PAYMENT_METHODS.map((m) => {
              const Icon = ICONS[m];
              return (
                <button
                  key={m}
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-sm font-bold",
                    method === m ? "border-brand-600 bg-brand-50 text-brand-900" : "border-slate-200 text-slate-700",
                  )}
                >
                  <Icon className="size-5" /> {m}
                </button>
              );
            })}
          </div>

          {method === "Card" && (
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-500">Test card pre-filled. Any values work in demo mode.</div>
              <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} inputMode="numeric" aria-label="Card number" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} aria-label="Expiry" className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm" />
                <input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} aria-label="CVC" className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm" />
              </div>
              <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="Name on card" aria-label="Name on card" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
            </div>
          )}
          {method === "Bank transfer" && (
            <div className="space-y-1 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="text-xs font-semibold text-slate-500">Sample details (demo only, do not send money)</div>
              <div className="flex justify-between"><span className="text-slate-500">UPI ID</span><span className="font-mono">spiceroute@demo</span></div>
              <div className="flex justify-between"><span className="text-slate-500">A/C</span><span className="font-mono">0000 1234 5678</span></div>
              <div className="flex justify-between"><span className="text-slate-500">IFSC</span><span className="font-mono">DEMO0000001</span></div>
            </div>
          )}
          {method === "Cash" && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Your waiter will collect cash at the table. Tap confirm once it&apos;s handed over.</p>}
          {(method === "Apple Pay" || method === "Google Pay") && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Simulated wallet sheet. In production, connect a gateway&apos;s sandbox (e.g. Stripe or Razorpay test mode).</p>}
        </div>
      )}

      {stage === "processing" && (
        <div className="flex flex-col items-center gap-4 px-5 py-16">
          <div className="size-14 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <div className="font-semibold">Processing {method} (demo)…</div>
        </div>
      )}
      {stage === "success" && (
        <div className="flex flex-col items-center gap-2 px-5 py-16">
          <CheckCircle2 className="size-16 text-emerald-600" />
          <div className="text-xl font-black">{formatINR(amount)} paid</div>
          <div className="text-sm text-slate-500">via {method} · demo</div>
        </div>
      )}
    </Sheet>
  );
}
