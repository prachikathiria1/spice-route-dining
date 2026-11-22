import type { OrderStatus, TableStatus } from "@/lib/types";

export const TABLE_STATUS_STYLE: Record<TableStatus | "Help", { label: string; card: string; chip: string; dot: string }> = {
  Free: { label: "Free", card: "border-slate-200 bg-white", chip: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  Ordering: { label: "Ordering", card: "border-sky-300 bg-sky-50", chip: "bg-sky-600 text-white", dot: "bg-sky-500" },
  Eating: { label: "Eating", card: "border-emerald-300 bg-emerald-50", chip: "bg-emerald-600 text-white", dot: "bg-emerald-500" },
  Bill: { label: "Bill", card: "border-violet-300 bg-violet-50", chip: "bg-violet-600 text-white", dot: "bg-violet-500" },
  Help: { label: "HELP", card: "border-red-500 bg-red-50", chip: "bg-red-600 text-white", dot: "bg-red-600" },
};

export const ORDER_STATUS_STYLE: Record<OrderStatus, { label: string; chip: string }> = {
  placed: { label: "New", chip: "bg-brand-600 text-white" },
  sent: { label: "In queue", chip: "bg-sky-600 text-white" },
  preparing: { label: "Preparing", chip: "bg-amber-500 text-slate-950" },
  ready: { label: "Ready", chip: "bg-emerald-600 text-white" },
  served: { label: "Served", chip: "bg-slate-200 text-slate-700" },
  cancelled: { label: "Cancelled", chip: "bg-slate-200 text-slate-500 line-through" },
};
