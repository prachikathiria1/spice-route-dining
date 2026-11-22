"use client";

import { BellRing, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button, Sheet } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { CALL_TAGS, type CallTag, type WaiterCall } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

const TAG_EMOJI: Record<string, string> = { Water: "💧", Napkins: "🧻", Bill: "🧾", Cutlery: "🍴" };

export function CallWaiterSheet({
  open,
  onClose,
  activeCall,
  onCall,
  onCancel,
}: {
  open: boolean;
  onClose: () => void;
  activeCall: WaiterCall | undefined;
  onCall: (tags: CallTag[], note: string) => void;
  onCancel: (id: string) => void;
}) {
  const [tags, setTags] = useState<CallTag[]>([]);
  const [note, setNote] = useState("");
  const now = useNow(1000);
  const toggle = (t: CallTag) => setTags((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <BellRing className="size-5 text-red-600" /> Call a waiter
        </span>
      }
    >
      <div className="space-y-5 p-5">
        {activeCall ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
            <div className="mt-2 text-lg font-bold text-emerald-900">{activeCall.acknowledgedAt ? "A waiter is on the way" : "Staff have been alerted"}</div>
            <div className="mt-1 text-sm text-emerald-800">
              {activeCall.tags.length ? activeCall.tags.map((t) => `${TAG_EMOJI[t] ?? ""} ${t}`).join(" · ") : "General assistance"}
            </div>
            <div className="mt-2 font-mono text-2xl font-black tabular text-emerald-900">{formatClock(now - activeCall.createdAt)}</div>
            <Button variant="secondary" className="mt-4" onClick={() => onCancel(activeCall.id)}>
              Cancel request
            </Button>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-2 text-sm font-bold">What do you need? (optional)</div>
              <div className="grid grid-cols-2 gap-2">
                {CALL_TAGS.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggle(t)}
                    aria-pressed={tags.includes(t)}
                    className={cn(
                      "flex h-14 items-center justify-center gap-2 rounded-2xl border-2 text-base font-bold transition",
                      tags.includes(t) ? "border-red-600 bg-red-50 text-red-800" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <span aria-hidden>{TAG_EMOJI[t]}</span> {t}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              placeholder="Anything else? (e.g. high chair)"
              aria-label="Note for the waiter"
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-red-500"
            />
            <Button
              variant="danger"
              size="lg"
              className="w-full"
              onClick={() => {
                onCall(tags, note);
                setTags([]);
                setNote("");
              }}
            >
              <BellRing className="size-5" /> Call waiter now
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
