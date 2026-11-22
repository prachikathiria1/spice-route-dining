import type { MenuItem } from "./types";

/** Bundled photos (Unsplash License) for seed dishes — see public/dishes/CREDITS.md. */
const BUNDLED = new Set([
  "chicken-tikka", "punjabi-samosa", "butter-chicken", "paneer-butter-masala", "chole-masala",
  "rogan-josh", "tandoori-prawns", "butter-naan", "garlic-naan", "chicken-biryani", "veg-pulao",
  "gulab-jamun", "mango-kulfi", "mango-lassi", "masala-chai", "nimbu-soda", "watermelon-cooler",
]);

export const HERO_IMAGE = "/dishes/hero-platter.jpg";

/** The dish's photo, or null when there isn't one (UI then shows a clean text-only card). */
export function dishImage(item: Pick<MenuItem, "id" | "image">): string | null {
  if (item.image?.trim()) return item.image.trim();
  return BUNDLED.has(item.id) ? `/dishes/${item.id}.jpg` : null;
}
