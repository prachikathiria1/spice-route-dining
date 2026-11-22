import Link from "next/link";
import { RoleBadge, RoleProvider, SignOutButton } from "@/components/role";
import { requireSuper } from "@/lib/session";

export const metadata = { title: "Super admin · Smart Dining" };

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  await requireSuper();
  return (
    <RoleProvider role="super">
      <div className="min-h-dvh bg-[#f6f5f3]">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
            <Link href="/super" className="flex items-center gap-2 font-extrabold tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-xs text-white">SD</span>
              <span className="hidden sm:inline">Smart Dining</span>
            </Link>
            <div className="ml-auto flex items-center gap-1.5">
              <RoleBadge view="super" />
              <SignOutButton to="/super/login" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </div>
    </RoleProvider>
  );
}
