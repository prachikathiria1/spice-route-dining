import { requireRole } from "@/lib/session";

export default async function WaiterLayout({ children }: { children: React.ReactNode }) {
  await requireRole("waiter", "/staff");
  return children;
}
