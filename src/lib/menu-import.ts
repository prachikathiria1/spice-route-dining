import type { Allergen, MenuItem, Station, ThemeId } from "./types";
import { uid } from "./utils";

/** What the reader (AI or OCR) produces; reviewed by a human before saving. */
export interface ImportedItem {
  key: string;
  name: string;
  category: string;
  price: number;
  sizes: { label: string; price: number }[];
  description: string;
  veg: boolean | null;
  spiceLevel: 0 | 1 | 2 | 3;
}

const has = (s: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}`, "i").test(s));

const NON_VEG = ["chicken", "mutton", "lamb", "fish", "prawn", "shrimp", "egg", "keema", "beef", "pork", "crab", "gosht", "murg", "meat", "bacon", "ham", "tuna", "salmon", "seafood"];
const DRINK = ["lassi", "chai", "tea", "coffee", "latte", "cappuccino", "espresso", "juice", "soda", "shake", "smoothie", "mocktail", "lemonade", "cooler", "water", "cola", "drink", "beverage", "mojito", "buttermilk", "chaas"];
const DESSERT = ["dessert", "sweet", "ice cream", "kulfi", "gulab", "jamun", "rasmalai", "halwa", "kheer", "brownie", "cake", "pastry", "falooda", "jalebi", "pudding"];
const TANDOOR = ["tandoor", "tikka", "kebab", "kabab", "naan", "roti", "kulcha", "paratha", "seekh", "malai tikka"];

export function inferStation(name: string, category: string): Station {
  const s = `${name} ${category}`;
  if (has(s, DRINK)) return "Drinks";
  if (has(s, DESSERT) || has(s, ["salad", "raita", "chaat"])) return "Cold";
  if (has(s, TANDOOR) || /bread/i.test(category)) return "Tandoor";
  return "Curry";
}

export function inferAllergens(name: string, description: string): Allergen[] {
  const s = `${name} ${description}`;
  const out = new Set<Allergen>();
  if (has(s, ["paneer", "cheese", "butter", "cream", "malai", "makhani", "lassi", "milk", "curd", "yogurt", "yoghurt", "ghee", "kulfi", "rasmalai", "latte", "shake", "raita", "kheer"])) out.add("Dairy");
  if (has(s, ["cashew", "kaju", "almond", "badam", "pista", "pistachio", "walnut", "peanut", "nut"])) out.add("Nuts");
  if (has(s, ["naan", "roti", "paratha", "kulcha", "bread", "pizza", "pasta", "noodle", "burger", "sandwich", "samosa", "cake", "maida", "wheat", "bhatura"])) out.add("Gluten");
  if (has(s, ["egg", "omelette", "anda", "mayo"])) out.add("Egg");
  if (has(s, ["prawn", "shrimp", "crab", "lobster"])) out.add("Shellfish");
  if (has(s, ["soy", "tofu", "manchurian"])) out.add("Soy");
  return [...out];
}

export const guessVeg = (name: string, description = "") => !has(`${name} ${description}`, NON_VEG);

const PREP: Record<Station, number> = { Drinks: 3, Cold: 4, Tandoor: 12, Curry: 14 };

/** Reviewed imported items → menu items (keeps ids stable for re-imports of the same names). */
export function toMenuItems(items: ImportedItem[], existing: MenuItem[] = []): MenuItem[] {
  const byName = new Map(existing.map((m) => [m.name.trim().toLowerCase(), m]));
  return items
    .filter((i) => i.name.trim() && (i.price > 0 || i.sizes.some((s) => s.price > 0)))
    .map((i, idx) => {
      const prev = byName.get(i.name.trim().toLowerCase());
      const station = inferStation(i.name, i.category);
      const sizes = i.sizes.filter((s) => s.label.trim() && s.price > 0).map((s, k) => ({ id: `s${k}`, label: s.label.trim(), price: Math.round(s.price) }));
      const price = sizes.length ? Math.max(...sizes.map((s) => s.price)) : Math.round(i.price);
      return {
        ...(prev ?? {}),
        id: prev?.id ?? uid(),
        name: i.name.trim(),
        description: i.description.trim(),
        category: i.category.trim() || "Menu",
        station: prev?.station ?? station,
        price,
        sizes: sizes.length ? sizes : undefined,
        addOns: prev?.addOns,
        allergens: prev?.allergens ?? inferAllergens(i.name, i.description),
        spiceLevel: i.spiceLevel,
        veg: i.veg ?? guessVeg(i.name, i.description),
        prepMinutes: prev?.prepMinutes ?? PREP[station],
        available: prev?.available ?? true,
        popular: prev?.popular,
        image: prev?.image,
        sortOrder: idx,
      } satisfies MenuItem;
    });
}

const CUISINE_RULES: { cuisine: string; theme: ThemeId; words: string[] }[] = [
  { cuisine: "Cafe", theme: "coffee", words: ["latte", "cappuccino", "espresso", "americano", "croissant", "sandwich", "brownie", "cold brew"] },
  { cuisine: "Italian", theme: "olive", words: ["pizza", "pasta", "risotto", "lasagna", "bruschetta", "margherita", "penne", "spaghetti"] },
  { cuisine: "Chinese", theme: "chilli", words: ["noodle", "manchurian", "fried rice", "dim sum", "momo", "schezwan", "szechuan", "chilli chicken", "spring roll", "hakka"] },
  { cuisine: "South Indian", theme: "leaf", words: ["dosa", "idli", "vada", "uttapam", "sambar", "rasam", "appam", "pongal"] },
  { cuisine: "Bakery & Desserts", theme: "rose", words: ["cake", "pastry", "cupcake", "donut", "macaron", "waffle", "pancake", "sundae"] },
  { cuisine: "North Indian", theme: "saffron", words: ["paneer", "naan", "tikka", "biryani", "dal", "masala", "kulcha", "tandoori", "korma", "makhani"] },
];

export function detectCuisine(items: { name: string; category?: string }[]): { cuisine: string; theme: ThemeId } {
  const text = items.map((i) => `${i.name} ${i.category ?? ""}`).join(" ").toLowerCase();
  let best = { cuisine: "Multi-cuisine", theme: "indigo" as ThemeId, score: 0 };
  for (const r of CUISINE_RULES) {
    const score = r.words.reduce((a, w) => a + (text.split(w).length - 1), 0);
    if (score > best.score) best = { ...r, score };
  }
  return { cuisine: best.cuisine, theme: best.theme };
}

/**
 * Free fallback: turn OCR / PDF text into items. Handles lines like
 *   "Paneer Tikka ........ 280"   "Butter Naan  ₹ 60"   "Dal Makhani  180 / 290"
 * Lines without a price that look like headings become the current category.
 */
export function parseMenuText(text: string): ImportedItem[] {
  const out: ImportedItem[] = [];
  let category = "Menu";
  let sizeLabels: string[] | null = null;
  const lines = text.split(/\r?\n/).map((l) => l.replace(/[|_•·]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const priceRe = /(?:₹|rs\.?|inr)?\s*(\d{2,5})(?:\.\d{1,2})?\s*(?:\/-)?/gi;

  for (const raw of lines) {
    const line = raw.replace(/\.{2,}/g, " ");
    // "Half Full" / "Regular Large" header lines set size labels for the section
    if (/^(half|full|small|medium|large|regular|qtr|quarter|single|double)(\s+(half|full|small|medium|large|regular|qtr|quarter|single|double))+$/i.test(line)) {
      sizeLabels = line.split(" ").map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
      continue;
    }
    const prices = [...line.matchAll(priceRe)].map((m) => Number(m[1])).filter((p) => p >= 10 && p <= 20000);
    const name = line.replace(priceRe, " ").replace(/[-–—:/₹]+/g, " ").replace(/\b(rs|inr)\b\.?/gi, " ").replace(/\s+/g, " ").trim();

    if (!prices.length) {
      const letters = name.replace(/[^a-z]/gi, "");
      if (letters.length >= 3 && name.length <= 32 && name.split(" ").length <= 4) {
        category = name.split(" ").map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        sizeLabels = null;
      } else if (out.length && name.length > 12) {
        // A description line under the previous item
        const last = out[out.length - 1];
        last.description = `${last.description} ${name}`.trim().slice(0, 200);
      }
      continue;
    }
    if (name.replace(/[^a-z]/gi, "").length < 3) continue;
    const pretty = name.length > 3 && name === name.toUpperCase() ? name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : name;
    const sizes = prices.length >= 2 ? prices.slice(0, 3).map((p, i) => ({ label: sizeLabels?.[i] ?? (prices.length === 2 ? ["Half", "Full"][i] : ["Small", "Medium", "Large"][i]), price: p })) : [];
    out.push({
      key: uid(),
      name: pretty.slice(0, 80),
      category,
      price: sizes.length ? 0 : prices[0],
      sizes,
      description: "",
      veg: guessVeg(pretty),
      spiceLevel: has(pretty, ["chilli", "spicy", "schezwan", "vindaloo", "pepper", "laal maas"]) ? 2 : 0,
    });
  }
  return out;
}
