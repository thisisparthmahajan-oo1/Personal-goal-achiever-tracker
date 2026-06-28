import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  verifySession,
} from "@/lib/auth";

// Paths that bypass the session gate. /login obviously needs to render,
// /api/health is the public liveness probe, /api/mcp gates itself by
// path-token, and .well-known is reserved for protocol discovery
// (OAuth/ACME/etc) — Claude probes /.well-known/oauth-protected-resource
// when adding the MCP connector and needs a clean 404, not a redirect to
// /login (which would read as a sign-in flow).
const BYPASS_PREFIXES = ["/login", "/api/health", "/api/mcp", "/.well-known"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Expose the current pathname to the root layout so it can decide whether
  // to render the app chrome (sidebar/topbar) — we skip it on /login.
  const passthrough = () => {
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  };

  if (BYPASS_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return passthrough();
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
    return passthrough();
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
