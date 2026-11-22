import { NextResponse, type NextRequest } from "next/server";
import { canAccess, SESSION_COOKIE, verifySession } from "@/lib/auth";

/** Optimistic route gate. Server layouts re-check the session too. */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const need = pathname.startsWith("/admin") ? "admin" : "waiter";
  const role = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (canAccess(role, need)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname + search);
  if (need === "admin") url.searchParams.set("need", "admin");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/kitchen/:path*", "/floor/:path*"],
};
