"use client";
import { useEffect, useState } from "react";

/** Re-renders every `intervalMs` and returns the current time. Returns 0 during SSR to avoid hydration drift. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now || Date.now();
}
