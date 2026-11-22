import { NextResponse, type NextRequest } from "next/server";
import { canAccess, SESSION_COOKIE, verifySession } from "@/lib/auth";

/** Optimistic route gate. Server layouts re-check the session too. */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const url = req.nextUrl.clone();
  url.search = "";

  if (pathname.startsWith("/super")) {
    if (pathname === "/super/login" || session?.role === "super") return NextResponse.next();
    url.pathname = "/super/login";
    return NextResponse.redirect(url);
  }

  // /r/<slug>/(staff|kitchen|floor|admin)...
  const m = /^\/r\/([^/]+)\/(staff|kitchen|floor|admin)(\/|$)/.exec(pathname);
  if (!m) return NextResponse.next();
  const [, rid, section] = m;
  const need = section === "admin" ? "admin" : "waiter";
  if (canAccess(session, need, rid)) return NextResponse.next();
  url.pathname = `/r/${rid}/login`;
  url.searchParams.set("next", pathname + search);
  if (need === "admin") url.searchParams.set("need", "admin");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/super/:path*", "/r/:slug/staff/:path*", "/r/:slug/kitchen/:path*", "/r/:slug/floor/:path*", "/r/:slug/admin/:path*"],
};
