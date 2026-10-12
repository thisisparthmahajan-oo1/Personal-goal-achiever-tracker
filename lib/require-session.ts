import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  verifySession,
} from "@/lib/auth";

// Server Actions are reachable by a direct POST to *any* route — including
// /login, which the middleware lets through unauthenticated — so the
// middleware gate alone doesn't protect them. Every exported action must call
// this first. Kept out of lib/auth.ts because that module is imported by the
// Edge middleware and must stay free of next/headers.
export async function requireSession(): Promise<void> {
  const secret = process.env.SESSION_SECRET ?? "";
  const value = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? "";
  if (!(await verifySession(secret, value, SESSION_MAX_AGE_MS))) {
    redirect("/login");
  }
}
