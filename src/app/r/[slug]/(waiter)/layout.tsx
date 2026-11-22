import { requireRole } from "@/lib/session";

export default async function WaiterLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  await requireRole(slug, "waiter", `/r/${slug}/staff`);
  return children;
}
