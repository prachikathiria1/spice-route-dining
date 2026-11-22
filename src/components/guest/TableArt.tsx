"use client";

import { cn } from "@/lib/utils";

/** A friendly top-down table with chairs around it — one chair per seat. */
export function TableArt({ number, seats, busy, className }: { number: string; seats: number; busy?: boolean; className?: string }) {
  const n = Math.max(2, Math.min(10, seats));
  const round = n <= 4;
  const chairs = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 60 + Math.cos(a) * 44, y: 60 + Math.sin(a) * 44, deg: (a * 180) / Math.PI + 90 };
  });
  return (
    <svg viewBox="0 0 120 120" className={cn("overflow-visible", className)} aria-hidden>
      {chairs.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.deg})`} className="chair transition-transform duration-300">
          <rect x={-11} y={-7} width={22} height={14} rx={6} fill={busy ? "#cbd5e1" : "var(--color-brand-300)"} />
          <rect x={-8} y={-10} width={16} height={5} rx={2.5} fill={busy ? "#94a3b8" : "var(--color-brand-500)"} />
        </g>
      ))}
      {round ? (
        <circle cx={60} cy={60} r={31} fill={busy ? "#f1f5f9" : "white"} stroke={busy ? "#cbd5e1" : "var(--color-brand-500)"} strokeWidth={3} />
      ) : (
        <rect x={27} y={27} width={66} height={66} rx={18} fill={busy ? "#f1f5f9" : "white"} stroke={busy ? "#cbd5e1" : "var(--color-brand-500)"} strokeWidth={3} />
      )}
      {/* little plate + cutlery */}
      <circle cx={60} cy={60} r={19} fill="none" stroke={busy ? "#e2e8f0" : "var(--color-brand-100)"} strokeWidth={6} />
      <text x={60} y={68} textAnchor="middle" fontSize={24} fontWeight={800} fill={busy ? "#94a3b8" : "#18181b"} fontFamily="inherit">
        {number}
      </text>
    </svg>
  );
}
