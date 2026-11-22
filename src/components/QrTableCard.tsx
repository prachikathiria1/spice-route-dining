"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { tableNumber } from "@/lib/utils";

export function tableUrl(baseUrl: string, slug: string, tableId: string) {
  return `${baseUrl.replace(/\/$/, "")}/r/${slug}/t/${tableNumber(tableId)}`;
}

export function QrTableCard({ slug, tableId, label, baseUrl, restaurantName }: { slug: string; tableId: string; label: string; baseUrl: string; restaurantName: string }) {
  const url = tableUrl(baseUrl, slug, tableId);
  return (
    <div className="flex break-inside-avoid flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 text-center">
      <div className="text-xs font-bold uppercase tracking-widest text-brand-700">{restaurantName}</div>
      <div className="mt-1 text-3xl font-black">{label}</div>
      <div className="mt-3 rounded-xl bg-white p-2 ring-1 ring-slate-200">
        <QRCodeSVG value={url} size={168} level="M" marginSize={1} title={`QR code for ${label}`} />
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-700">Scan to view menu, order &amp; pay</div>
      <div className="mt-1 break-all font-mono text-xs text-slate-500">{url}</div>
      <Link href={`/r/${slug}/t/${tableNumber(tableId)}`} target="_blank" className="no-print mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        Test this table <ExternalLink className="size-3.5" />
      </Link>
    </div>
  );
}
