import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getUnscopedDb } from "@/lib/db";
import { ProfileSchema, type Profile, type ProfileKind } from "@/lib/schemas";

const COLLECTION = "profiles";

async function collection() {
  const db = await getUnscopedDb();
  return db.collection<Profile>(COLLECTION);
}

// Module-level slug cache. Profiles rarely change; the cache is invalidated on
// create or whenever the process restarts.
const slugCache = new Map<string, Profile>();

export async function list(): Promise<Profile[]> {
  const col = await collection();
  const docs = await col.find({}).sort({ created_at: 1 }).toArray();
  return docs.map((d) => ProfileSchema.parse(d));
}

export async function getBySlug(slug: string): Promise<Profile | null> {
  const cached = slugCache.get(slug);
  if (cached) return cached;
  const col = await collection();
  const doc = await col.findOne({ slug } as Filter<Profile>);
  if (!doc) return null;
  const parsed = ProfileSchema.parse(doc);
  slugCache.set(slug, parsed);
  return parsed;
}

export async function get(id: string): Promise<Profile | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id } as Filter<Profile>);
  return doc ? ProfileSchema.parse(doc) : null;
}

const SEEDS: { slug: string; name: string; kind: ProfileKind }[] = [
  { slug: "personal", name: "Personal", kind: "personal" },
  { slug: "office", name: "Office", kind: "office" },
];

/**
 * Idempotent. Inserts the seed profiles if they aren't already present.
 * Returns the full list of profiles after seeding.
 */
export async function ensureSeeded(): Promise<Profile[]> {
  const col = await collection();
  for (const seed of SEEDS) {
    const existing = await col.findOne({ slug: seed.slug } as Filter<Profile>);
    if (existing) continue;
    const idEnvVar = `${seed.slug.toUpperCase()}_PROFILE_ID`;
    const _id = process.env[idEnvVar] ?? randomUUID();
    const now = new Date();
    await col.insertOne({
      _id,
      slug: seed.slug,
      name: seed.name,
      kind: seed.kind,
      created_at: now,
      updated_at: now,
    });
  }
  slugCache.clear();
  return list();
}
