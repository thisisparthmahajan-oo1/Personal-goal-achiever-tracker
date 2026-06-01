import { cookies } from "next/headers";
import { getBySlug as getProfileBySlug, list as listProfiles } from "@/lib/repositories/profiles";
import type { Profile } from "@/lib/schemas";

const COOKIE_NAME = "profile_slug";
const DEFAULT_SLUG = "personal";

/**
 * Resolve the active profile slug. Priority:
 *   1. TRACKER_PROFILE_SLUG env (MCP server / scripts)
 *   2. profile_slug cookie (web app)
 *   3. "personal"
 */
export async function getActiveProfileSlug(): Promise<string> {
  const envSlug = process.env.TRACKER_PROFILE_SLUG;
  if (envSlug && envSlug.trim().length > 0) return envSlug.trim();
  try {
    const jar = await cookies();
    const v = jar.get(COOKIE_NAME)?.value;
    if (v && v.trim().length > 0) return v.trim();
  } catch {
    // cookies() unavailable outside of a request context (e.g. background scripts) — fall through.
  }
  return DEFAULT_SLUG;
}

/**
 * Resolve the active profile's _id. Reads slug per request; profile lookup
 * itself is cached in module memory.
 */
export async function getActiveProfileId(): Promise<string> {
  const slug = await getActiveProfileSlug();
  const profile = await getProfileBySlug(slug);
  if (profile) return profile._id;
  // Fall back to "personal" if the requested profile no longer exists.
  if (slug !== DEFAULT_SLUG) {
    console.warn(
      `[profile] active slug "${slug}" not found in profiles collection; falling back to "${DEFAULT_SLUG}"`
    );
    const fallback = await getProfileBySlug(DEFAULT_SLUG);
    if (fallback) return fallback._id;
  }
  throw new Error(
    `[profile] No profile found for slug "${slug}" and no "${DEFAULT_SLUG}" fallback. Did you run scripts/migrate-add-profile-id.ts?`
  );
}

export async function listAvailableProfiles(): Promise<Profile[]> {
  return listProfiles();
}

export const PROFILE_COOKIE_NAME = COOKIE_NAME;
