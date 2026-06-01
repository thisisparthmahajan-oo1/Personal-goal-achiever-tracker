#!/usr/bin/env tsx
/**
 * One-time migration: introduce the multi-tenant profile model.
 *
 * 1. Seeds the `profiles` collection with "personal" and "office".
 * 2. Backfills `profile_id` on every existing document in scoped collections,
 *    assigning all current data to the personal profile.
 * 3. Creates indexes on `profile_id` (and useful compound indexes).
 *
 * REQUIRES a Mongo dump first — pass --i-have-backed-up to acknowledge.
 *
 * Run with: npx tsx scripts/migrate-add-profile-id.ts --i-have-backed-up
 */

import { clientPromise, getUnscopedDb } from "../lib/db";
import { ensureSeeded } from "../lib/repositories/profiles";

const SCOPED_COLLECTIONS = [
  "goals",
  "tasks",
  "task_instances",
  "goal_notes",
  "todos",
  "book_entries",
  "exercise_weights",
] as const;

// Useful compound indexes — speeds up scoped queries the app actually does.
const COMPOUND_INDEXES: Record<string, { fields: Record<string, 1 | -1>; name?: string }[]> = {
  tasks: [
    { fields: { profile_id: 1, goal_id: 1 } },
    { fields: { profile_id: 1, parent_task_id: 1 } },
  ],
  task_instances: [
    { fields: { profile_id: 1, task_id: 1 } },
  ],
  goal_notes: [
    { fields: { profile_id: 1, goal_id: 1 } },
  ],
  todos: [
    { fields: { profile_id: 1, completed_at: 1 } },
  ],
};

async function main() {
  if (!process.argv.includes("--i-have-backed-up")) {
    console.error("\nRefusing to run without --i-have-backed-up flag.\n");
    console.error("Before running this migration, take a Mongo dump:");
    console.error(
      `  mongodump --uri="mongodb://127.0.0.1:27017" --db=personal_tracker --out=backups/pre-profile-migration-$(date +%Y%m%d-%H%M%S)\n`
    );
    console.error(
      "Then re-run with: npx tsx scripts/migrate-add-profile-id.ts --i-have-backed-up\n"
    );
    process.exit(1);
  }

  console.log("Seeding profiles...");
  const profiles = await ensureSeeded();
  const personal = profiles.find((p) => p.slug === "personal");
  if (!personal) throw new Error("Failed to seed 'personal' profile");
  console.log(`  personal._id = ${personal._id}`);
  const office = profiles.find((p) => p.slug === "office");
  if (office) console.log(`  office._id   = ${office._id}`);

  const db = await getUnscopedDb();

  console.log("\nBackfilling profile_id on existing documents...");
  for (const name of SCOPED_COLLECTIONS) {
    const col = db.collection(name);
    const result = await col.updateMany(
      { profile_id: { $exists: false } },
      { $set: { profile_id: personal._id } }
    );
    console.log(
      `  ${name.padEnd(20)} matched=${result.matchedCount}, modified=${result.modifiedCount}`
    );
  }

  console.log("\nCreating indexes...");
  for (const name of SCOPED_COLLECTIONS) {
    const col = db.collection(name);
    await col.createIndex({ profile_id: 1 });
    console.log(`  ${name.padEnd(20)} { profile_id: 1 }`);
    for (const spec of COMPOUND_INDEXES[name] ?? []) {
      await col.createIndex(spec.fields, spec.name ? { name: spec.name } : undefined);
      console.log(
        `  ${name.padEnd(20)} ${JSON.stringify(spec.fields)}`
      );
    }
  }
  // Unique slug on profiles
  await db.collection("profiles").createIndex({ slug: 1 }, { unique: true });
  console.log(`  ${"profiles".padEnd(20)} { slug: 1 } (unique)`);

  console.log("\nMigration complete.");
  const client = await clientPromise;
  await client.close();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
