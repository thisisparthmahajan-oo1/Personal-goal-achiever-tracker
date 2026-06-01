"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getBySlug } from "@/lib/repositories/profiles";
import { PROFILE_COOKIE_NAME } from "@/lib/profile";

export async function setActiveProfileAction(slug: string) {
  const profile = await getBySlug(slug);
  if (!profile) {
    throw new Error(`Profile not found: ${slug}`);
  }
  const jar = await cookies();
  jar.set(PROFILE_COOKIE_NAME, slug, {
    httpOnly: false, // readable client-side so the switcher can show the current selection without an extra round-trip
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
  // Refresh the whole layout — every server component re-fetches under the new profile.
  revalidatePath("/", "layout");
}
