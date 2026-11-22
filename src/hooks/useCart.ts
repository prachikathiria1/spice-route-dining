"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderLine } from "@/lib/types";

/** Per-device cart for a table. Kept in localStorage so a refresh doesn't lose it. */
export function useCart(tableId: string) {
  const key = `spice-route:cart:${tableId}`;
  const [lines, setLines] = useState<OrderLine[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setLines(raw ? (JSON.parse(raw) as OrderLine[]) : []);
    } catch {
      setLines([]);
    }
  }, [key]);

  const persist = useCallback(
    (next: OrderLine[]) => {
      setLines(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  const add = useCallback(
    (line: OrderLine) => {
      // Merge with an identical configuration already in the cart.
      const sig = (l: OrderLine) => `${l.menuItemId}|${l.sizeLabel ?? ""}|${l.addOns.map((a) => a.id).sort().join(",")}|${l.notes ?? ""}`;
      const existing = lines.find((l) => sig(l) === sig(line));
      persist(existing ? lines.map((l) => (l === existing ? { ...l, qty: l.qty + line.qty } : l)) : [...lines, line]);
    },
    [lines, persist],
  );

  const setQty = useCallback((lineId: string, qty: number) => persist(qty <= 0 ? lines.filter((l) => l.lineId !== lineId) : lines.map((l) => (l.lineId === lineId ? { ...l, qty } : l))), [lines, persist]);
  const clear = useCallback(() => persist([]), [persist]);

  const count = lines.reduce((a, l) => a + l.qty, 0);
  const total = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  return { lines, add, setQty, clear, count, total };
}

export type Cart = ReturnType<typeof useCart>;
