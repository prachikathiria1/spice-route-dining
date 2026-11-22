import { requireRole } from "@/lib/session";

export default async function AdminLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  await requireRole(slug, "admin", `/r/${slug}/admin`);
  return children;
}
