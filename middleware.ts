import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  verifySession,
} from "@/lib/auth";

// Paths that bypass the session gate. /login obviously needs to render,
// /api/health is the public liveness probe, and /api/mcp will gate itself
// with a bearer token when that lands.
const BYPASS_PREFIXES = ["/login", "/api/health", "/api/mcp"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (BYPASS_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET ?? "";
  if (!secret) {
    // Misconfigured — fail closed and send to login with a hint.
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=config";
    return NextResponse.redirect(url);
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookie && (await verifySession(secret, cookie, SESSION_MAX_AGE_MS))) {
    return NextResponse.next();
  }

  const next = pathname + (req.nextUrl.search || "");
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Match every route except Next internals and static asset extensions.
  matcher: [
    "/((?!_next/|favicon\\.ico|robots\\.txt|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map|woff2?|ttf|otf)$).*)",
  ],
};
