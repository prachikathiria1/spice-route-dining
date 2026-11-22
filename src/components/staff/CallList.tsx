"use client";

import { BellRing, Check, Hand } from "lucide-react";
import { Button } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { useStore } from "@/lib/data/store";
import type { WaiterCall } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

export function CallList({ calls, compact }: { calls: WaiterCall[]; compact?: boolean }) {
  const { actions } = useStore();
  const now = useNow(1000);
  if (!calls.length) return <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">No waiter calls right now.</p>;
  return (
    <ul className="space-y-2">
      {calls.map((c) => {
        const age = now - c.createdAt;
        const urgent = !c.acknowledgedAt && age > 120_000;
        return (
          <li key={c.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border-2 bg-white px-4 py-3", c.acknowledgedAt ? "border-amber-300" : "border-red-500", urgent && "animate-pulse-ring")}>
            <BellRing className={cn("size-5 shrink-0", c.acknowledgedAt ? "text-amber-600" : "text-red-600")} />
            <div className="min-w-0 flex-1">
              <div className="font-black">
                Table {c.tableId.slice(1)}{" "}
                <span className={cn("ml-1 font-mono text-sm tabular", urgent ? "text-red-600" : "text-slate-600")}>{formatClock(age)}</span>
              </div>
              <div className="text-sm text-slate-600">
                {c.tags.length ? c.tags.join(" · ") : "Assistance"}
                {c.note && <span className="italic"> · “{c.note}”</span>}
                {c.acknowledgedAt && <span className="ml-1 font-semibold text-amber-700">· on the way</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {!c.acknowledgedAt && !compact && (
                <Button size="sm" variant="secondary" onClick={() => actions.acknowledgeCall(c.id)}>
                  <Hand className="size-4" /> On my way
                </Button>
              )}
              <Button size="sm" variant="success" onClick={() => actions.resolveCall(c.id)}>
                <Check className="size-4" /> Done
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
