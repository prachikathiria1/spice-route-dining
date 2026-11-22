"use client";
import { useEffect, useState } from "react";

/** Base URL encoded into QR codes: NEXT_PUBLIC_APP_URL, else the current origin. */
export function useBaseUrl(): string {
  const [base, setBase] = useState(process.env.NEXT_PUBLIC_APP_URL || "");
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_APP_URL) setBase(window.location.origin);
  }, []);
  return base;
}
