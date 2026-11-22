"use client";

import { useParams } from "next/navigation";
import { ReceiptView } from "@/components/ReceiptView";
import { FullScreenLoader } from "@/components/ui";
import { useStore } from "@/lib/data/store";

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { state, mode } = useStore();
  if (!state) return <FullScreenLoader label="Loading receipt…" />;
  const payment = state.payments.find((p) => p.id === id);
  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 py-6">
      {payment ? (
        <ReceiptView payment={payment} />
      ) : (
        <div className="py-20 text-center">
          <h1 className="text-xl font-black">Receipt not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === "local" ? "In local demo mode, receipts are only stored in the browser where you paid." : "This receipt link is invalid or was removed."}
          </p>
        </div>
      )}
    </div>
  );
}
