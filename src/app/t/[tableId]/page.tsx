"use client";

import { useParams } from "next/navigation";
import { GuestApp } from "@/components/guest/GuestApp";
import { normalizeTableId } from "@/lib/utils";

export default function TablePage() {
  const params = useParams<{ tableId: string }>();
  const tableId = normalizeTableId(params.tableId) ?? "invalid";
  return <GuestApp tableId={tableId} />;
}
