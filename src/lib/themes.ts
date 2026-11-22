import type { ThemeId } from "./types";

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export const THEMES: Record<ThemeId, { label: string; fits: string; palette: string[] }> = {
  saffron: { label: "Saffron", fits: "North Indian, Mughlai, dhaba", palette: ["#fff7ed", "#ffedd5", "#fed7aa", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412", "#7c2d12"] },
  leaf: { label: "Banana leaf", fits: "South Indian, healthy, vegetarian", palette: ["#f0fdf4", "#dcfce7", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534", "#14532d"] },
  chilli: { label: "Chilli red", fits: "Chinese, Indo-Chinese, grills", palette: ["#fef2f2", "#fee2e2", "#fecaca", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"] },
  olive: { label: "Olive", fits: "Italian, Mediterranean, pizza", palette: ["#f7fee7", "#ecfccb", "#d9f99d", "#bef264", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f", "#3f6212", "#365314"] },
  coffee: { label: "Coffee", fits: "Cafes, bakeries, breakfast", palette: ["#fffbeb", "#fef3c7", "#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"] },
  indigo: { label: "Indigo night", fits: "Bars, lounges, multi-cuisine", palette: ["#eef2ff", "#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81"] },
  rose: { label: "Rose", fits: "Desserts, ice cream, patisserie", palette: ["#fdf2f8", "#fce7f3", "#fbcfe8", "#f9a8d4", "#f472b6", "#ec4899", "#db2777", "#be185d", "#9d174d", "#831843"] },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

/** CSS custom properties that re-point Tailwind's brand-* colours to the theme. */
export function themeVars(theme: ThemeId | undefined): Record<string, string> {
  const t = THEMES[theme ?? "saffron"] ?? THEMES.saffron;
  return Object.fromEntries(STEPS.map((s, i) => [`--color-brand-${s}`, t.palette[i]]));
}
