import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccess, roleIn, SESSION_COOKIE, verifySession, type Session } from "./auth";
import type { SessionRole, StaffRole } from "./types";

export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

export async function roleForRestaurant(rid: string): Promise<SessionRole | null> {
  return roleIn(await currentSession(), rid);
}

/** Server-side guard for restaurant layouts. */
export async function requireRole(rid: string, need: StaffRole, next: string): Promise<void> {
  if (!canAccess(await currentSession(), need, rid)) redirect(`/r/${rid}/login?next=${encodeURIComponent(next)}${need === "admin" ? "&need=admin" : ""}`);
}

export async function requireSuper(): Promise<void> {
  if ((await currentSession())?.role !== "super") redirect("/super/login");
}
