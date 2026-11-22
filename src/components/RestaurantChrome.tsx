"use client";

import { Store } from "lucide-react";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useStaffRole } from "@/components/role";
import { useStore } from "@/lib/data/store";
import { StaffPrefsProvider } from "@/lib/i18n";
import { themeVars } from "@/lib/themes";

/** Applies the restaurant's theme, handles unknown/paused restaurants, sets the tab title. */
export function RestaurantChrome({ children }: { children: ReactNode }) {
  const { state, notFound } = useStore();
  const role = useStaffRole();
  const s = state?.settings[0];

  useEffect(() => {
    if (s?.restaurantName) document.title = s.restaurantName;
  }, [s?.restaurantName]);

  if (notFound || (s && s.active === false && !role))
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
        <Store className="size-12 text-slate-300" />
        <h1 className="text-2xl font-extrabold">{notFound ? "Restaurant not found" : "Not available right now"}</h1>
        <p className="max-w-sm text-slate-500">{notFound ? "This link or QR code doesn't match any restaurant. Please ask the staff." : "This restaurant has paused digital ordering. Please ask the staff."}</p>
        <Link href="/" className="mt-2 text-sm font-semibold text-slate-700 underline">
          Home
        </Link>
      </div>
    );

  return (
    <StaffPrefsProvider key={s?.defaultLanguage ?? "en"} defaultLang={s?.defaultLanguage}>
      <div style={themeVars(s?.theme)}>{children}</div>
    </StaffPrefsProvider>
  );
}
