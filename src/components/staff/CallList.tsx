"use client";

import { BellRing, Check, Footprints } from "lucide-react";
import { Button } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { useStore } from "@/lib/data/store";
import { useT, type TKey } from "@/lib/i18n";
import type { WaiterCall } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

const TAG_KEY: Record<string, TKey> = { Water: "tag.Water", Napkins: "tag.Napkins", Bill: "tag.Bill", Cutlery: "tag.Cutlery" };

export function CallList({ calls }: { calls: WaiterCall[] }) {
  const { actions } = useStore();
  const t = useT();
  const now = useNow(1000);
  if (!calls.length) return <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">{t("calls.none")}</p>;
  return (
    <ul className="space-y-2">
      {calls.map((c) => {
        const age = now - c.createdAt;
        const urgent = !c.acknowledgedAt && age > 120_000;
        return (
          <li key={c.id} className={cn("flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-white p-3", c.acknowledgedAt ? "border-amber-300" : "border-red-500", urgent && "animate-pulse-ring")}>
            <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl text-xl font-extrabold text-white", c.acknowledgedAt ? "bg-amber-500" : "bg-red-600")}>{c.tableId.slice(1)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-extrabold">
                <BellRing className="size-4 text-red-600" /> {t("table")} {c.tableId.slice(1)}
                <span className={cn("font-mono text-sm tabular", urgent ? "text-red-600" : "text-slate-500")}>{formatClock(age)}</span>
              </div>
              <div className="text-sm font-medium text-slate-600">
                {c.tags.length ? c.tags.map((x) => (TAG_KEY[x] ? t(TAG_KEY[x]) : x)).join(" · ") : t("calls.help")}
                {c.note && <span className="italic"> · “{c.note}”</span>}
                {c.acknowledgedAt && <span className="ml-1 font-bold text-amber-700">· {t("calls.onTheWay")}</span>}
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              {!c.acknowledgedAt && (
                <Button variant="secondary" className="h-12 flex-1 sm:flex-none" onClick={() => actions.acknowledgeCall(c.id)}>
                  <Footprints className="size-5" /> {t("btn.onMyWay")}
                </Button>
              )}
              <Button variant="success" className="h-12 flex-1 sm:flex-none" onClick={() => actions.resolveCall(c.id)}>
                <Check className="size-5" /> {t("btn.done")}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
