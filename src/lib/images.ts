import type { MenuItem } from "./types";

/**
 * Bundled photo library (Unsplash License, see public/dishes/CREDITS.md).
 * `names` are whole-phrase matches used to give any restaurant's matching dishes a
 * representative photo; `veg` keeps vegetarian dishes from ever showing a meat photo.
 */
const LIBRARY: { file: string; veg: boolean; names: string[] }[] = [
  { file: "chicken-tikka", veg: false, names: ["chicken tikka", "murg tikka", "chicken tikka kebab"] },
  { file: "punjabi-samosa", veg: true, names: ["samosa", "punjabi samosa", "aloo samosa", "veg samosa"] },
  { file: "butter-chicken", veg: false, names: ["butter chicken", "murg makhani", "chicken makhani", "chicken tikka masala"] },
  { file: "paneer-butter-masala", veg: true, names: ["paneer butter masala", "paneer makhani", "paneer tikka masala", "shahi paneer"] },
  { file: "chole-masala", veg: true, names: ["chole", "chole masala", "chana masala", "amritsari chole", "pindi chole"] },
  { file: "rogan-josh", veg: false, names: ["rogan josh", "mutton rogan josh", "lamb rogan josh", "mutton curry", "lamb curry"] },
  { file: "tandoori-prawns", veg: false, names: ["tandoori prawns", "tandoori jhinga", "prawn tikka"] },
  { file: "butter-naan", veg: true, names: ["butter naan", "naan", "plain naan"] },
  { file: "garlic-naan", veg: true, names: ["garlic naan", "lasooni naan"] },
  { file: "chicken-biryani", veg: false, names: ["chicken biryani", "hyderabadi chicken biryani", "chicken dum biryani"] },
  { file: "veg-pulao", veg: true, names: ["veg pulao", "vegetable pulao", "pulao", "veg pulav", "peas pulao"] },
  { file: "gulab-jamun", veg: true, names: ["gulab jamun"] },
  { file: "mango-kulfi", veg: true, names: ["mango kulfi", "kulfi"] },
  { file: "mango-lassi", veg: true, names: ["mango lassi", "mango shake"] },
  { file: "masala-chai", veg: true, names: ["masala chai", "chai", "cutting chai", "ginger tea", "masala tea"] },
  { file: "nimbu-soda", veg: true, names: ["nimbu soda", "masala nimbu soda", "fresh lime soda", "lime soda", "nimbu pani", "lemonade"] },
  { file: "watermelon-cooler", veg: true, names: ["watermelon cooler", "watermelon juice", "watermelon mojito"] },
];

/** Demo dish ids map straight to their photos. */
const BY_ID = new Map(LIBRARY.map((l) => [l.file, l.file]));
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

export const HERO_IMAGE = "/dishes/hero-platter.jpg";

type DishLike = Pick<MenuItem, "id" | "image"> & { name?: string; veg?: boolean };

function libraryMatch(item: DishLike): string | null {
  const id = BY_ID.get(item.id);
  if (id) return id;
  if (!item.name) return null;
  const n = norm(item.name);
  const hit = LIBRARY.find((l) => l.names.includes(n) && (item.veg === undefined || l.veg === item.veg));
  return hit?.file ?? null;
}

/** The dish's photo, or null when there isn't one (UI then shows a clean text-only card). */
export function dishImage(item: DishLike): string | null {
  if (item.image?.trim()) return item.image.trim();
  const f = libraryMatch(item);
  return f ? `/dishes/${f}.jpg` : null;
}

/** True when the photo comes from the shared library (not the restaurant's own). */
export const isRepresentativePhoto = (item: DishLike) => !item.image?.trim() && !BY_ID.has(item.id) && !!libraryMatch(item);
