import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccess, SESSION_COOKIE, verifySession } from "./auth";
import type { StaffRole } from "./types";

export async function currentRole(): Promise<StaffRole | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Server-side guard for layouts: redirects to /login when the role isn't allowed. */
export async function requireRole(need: StaffRole, next: string): Promise<StaffRole> {
  const role = await currentRole();
  if (!canAccess(role, need)) redirect(`/login?next=${encodeURIComponent(next)}${need === "admin" ? "&need=admin" : ""}`);
  return role!;
}
