"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_DAYS,
  signSession,
} from "@/lib/auth";

function safeNext(value: string | null): string {
  if (!value) return "/";
  // Only allow same-origin paths to prevent open-redirects.
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function loginAction(formData: FormData) {
  const passcode = String(formData.get("passcode") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  const expected = process.env.APP_PASSCODE ?? "";
  const secret = process.env.SESSION_SECRET ?? "";

  if (!expected || !secret) {
    redirect(`/login?error=config&next=${encodeURIComponent(next)}`);
  }

  // Naive equality is fine for the single shared passcode here; timing-attack
  // surface is one short string the attacker can already brute force at HTTPS
  // RPS limits. Rate-limit at the proxy if it ever matters.
  if (passcode !== expected) {
    redirect(`/login?error=wrong&next=${encodeURIComponent(next)}`);
  }

  const cookie = await signSession(secret, Date.now());
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
    path: "/",
  });

  redirect(next);
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
