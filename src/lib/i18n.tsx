"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "./types";

/** Staff-facing strings. Short words, no jargon: many staff read only basic English or Hindi. */
const DICT = {
  "nav.dashboard": ["Home", "होम"],
  "nav.orders": ["Orders", "ऑर्डर"],
  "nav.kitchen": ["Kitchen", "किचन"],
  "nav.floor": ["Tables", "टेबल"],
  "nav.menu": ["Menu", "मेन्यू"],
  "nav.tables": ["QR codes", "QR कोड"],
  "nav.settings": ["Settings", "सेटिंग"],
  "nav.more": ["More", "और"],
  "orders.title": ["Orders", "ऑर्डर"],
  "orders.subtitle": ["Send new orders to the kitchen. Serve what is ready.", "नए ऑर्डर किचन भेजें। तैयार खाना परोसें।"],
  "col.new": ["New", "नया"],
  "col.kitchen": ["In kitchen", "किचन में"],
  "col.ready": ["Ready to serve", "परोसने को तैयार"],
  "btn.sendKitchen": ["Send to kitchen", "किचन भेजें"],
  "btn.sendAll": ["Send all {n} to kitchen", "सभी {n} किचन भेजें"],
  "btn.served": ["Served", "परोस दिया"],
  "btn.onMyWay": ["Coming", "आ रहा हूँ"],
  "btn.done": ["Done", "हो गया"],
  "btn.start": ["Start", "शुरू करें"],
  "btn.ready": ["Ready", "तैयार"],
  "btn.recall": ["Undo", "वापस"],
  "btn.cancel": ["Cancel", "रद्द करें"],
  "calls.title": ["Customer needs help", "ग्राहक बुला रहे हैं"],
  "calls.none": ["Nobody is calling right now.", "अभी कोई नहीं बुला रहा।"],
  "calls.onTheWay": ["coming", "आ रहे हैं"],
  "calls.help": ["Help", "मदद"],
  "tag.Water": ["Water", "पानी"],
  "tag.Napkins": ["Napkins", "टिशू"],
  "tag.Bill": ["Bill", "बिल"],
  "tag.Cutlery": ["Spoon & fork", "चम्मच"],
  "empty": ["Nothing here", "यहाँ कुछ नहीं"],
  "table": ["Table", "टेबल"],
  "kitchen.title": ["Kitchen", "किचन"],
  "kitchen.subtitle": ["Tap a dish when it is done.", "डिश बनते ही उस पर टैप करें।"],
  "kitchen.all": ["All", "सभी"],
  "kitchen.clear": ["All clear. No orders waiting.", "सब हो गया। कोई ऑर्डर बाकी नहीं।"],
  "kitchen.readyPickup": ["Ready to pick up", "ले जाने को तैयार"],
  "kitchen.target": ["target", "समय"],
  "kitchen.otherStations": ["more at other counters", "और दूसरे काउंटर पर"],
  "floor.title": ["Tables", "टेबल"],
  "floor.subtitle": ["Tap a table to see its order.", "ऑर्डर देखने के लिए टेबल पर टैप करें।"],
  "floor.occupied": ["Tables busy", "भरी टेबल"],
  "floor.inProgress": ["Orders cooking", "बन रहे ऑर्डर"],
  "floor.calls": ["Calling you", "बुला रहे हैं"],
  "floor.sales": ["Sales today", "आज की बिक्री"],
  "floor.seated": ["seated", "बैठे हैं"],
  "floor.free": ["free", "खाली"],
  "floor.seats": ["seats", "कुर्सी"],
  "status.Free": ["Free", "खाली"],
  "status.Ordering": ["Ordering", "ऑर्डर कर रहे"],
  "status.Eating": ["Eating", "खा रहे"],
  "status.Bill": ["Wants bill", "बिल चाहिए"],
  "status.Help": ["HELP", "मदद"],
  "ostatus.placed": ["New", "नया"],
  "ostatus.sent": ["Waiting", "लाइन में"],
  "ostatus.preparing": ["Cooking", "बन रहा"],
  "ostatus.ready": ["Ready", "तैयार"],
  "ostatus.served": ["Served", "परोसा"],
  "ostatus.cancelled": ["Cancelled", "रद्द"],
  "sheet.noOrders": ["No orders yet.", "अभी कोई ऑर्डर नहीं।"],
  "sheet.total": ["Total with GST", "कुल (GST सहित)"],
  "sheet.customerView": ["Customer screen", "ग्राहक स्क्रीन"],
  "sheet.billRequested": ["Mark bill asked", "बिल माँगा"],
  "sheet.clear": ["Clear table", "टेबल खाली करें"],
  "sheet.whatsapp": ["Send bill on WhatsApp", "WhatsApp पर बिल भेजें"],
  "sheet.phone": ["Customer mobile number", "ग्राहक का मोबाइल नंबर"],
  "login.title": ["Staff login", "स्टाफ लॉगिन"],
  "login.choose": ["Choose who you are, then type your PIN.", "आप कौन हैं चुनें, फिर PIN डालें।"],
  "login.waiter": ["Waiter", "वेटर"],
  "login.waiterDesc": ["Orders, kitchen, tables", "ऑर्डर, किचन, टेबल"],
  "login.admin": ["Manager", "मैनेजर"],
  "login.adminDesc": ["Everything + menu & sales", "सब कुछ + मेन्यू व बिक्री"],
  "login.signIn": ["Login", "लॉगिन करें"],
  "login.wrong": ["Wrong PIN. Try again.", "गलत PIN। फिर से डालें।"],
  "prefs.bigText": ["Big text", "बड़े अक्षर"],
  "prefs.install": ["Install app", "ऐप इंस्टॉल करें"],
  "min": ["min", "मिनट"],
  "justNow": ["just now", "अभी"],
  "minAgo": ["{n} min ago", "{n} मिनट पहले"],
  "late": ["LATE", "देर"],
  "sound": ["Sound", "आवाज़"],
  "muted": ["Muted", "बंद"],
} as const satisfies Record<string, readonly [string, string]>;

export type TKey = keyof typeof DICT;

interface Prefs {
  lang: Lang;
  big: boolean;
  sound: boolean;
}
const KEY = "smartdine:staff-prefs";

const Ctx = createContext<{ prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void }>({ prefs: { lang: "en", big: false, sound: true }, setPrefs: () => {} });

export function StaffPrefsProvider({ defaultLang = "en", children }: { defaultLang?: Lang; children: ReactNode }) {
  const [prefs, set] = useState<Prefs>({ lang: defaultLang, big: false, sound: true });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Prefs> | null;
      if (saved) set((p) => ({ ...p, ...saved }));
    } catch {
      /* ignore */
    }
  }, []);
  const setPrefs = useCallback((p: Partial<Prefs>) => {
    set((cur) => {
      const next = { ...cur, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ prefs, setPrefs }), [prefs, setPrefs]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStaffPrefs = () => useContext(Ctx);

export function useT() {
  const { prefs } = useContext(Ctx);
  return useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      let s: string = DICT[key][prefs.lang === "hi" ? 1 : 0];
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    [prefs.lang],
  );
}
