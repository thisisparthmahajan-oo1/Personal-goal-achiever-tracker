#!/usr/bin/env tsx
/**
 * Migration: index `source_meeting_id` on todos so the per-meeting lookup
 * (listForMeeting) and the /todos page's source-chip resolution are fast.
 *
 * No data backfill — new docs default to null, existing docs are fine without
 * the field (Mongo indexes treat missing-field as null in non-unique indexes).
 *
 * REQUIRES a Mongo dump first — pass --i-have-backed-up to acknowledge.
 *
 * Run with: npx tsx scripts/migrate-add-todo-source-meeting.ts --i-have-backed-up
 */

import { clientPromise, getUnscopedDb } from "../lib/db";

async function main() {
  if (!process.argv.includes("--i-have-backed-up")) {
    console.error("\nRefusing to run without --i-have-backed-up flag.\n");
    console.error("Before running, take a Mongo dump:");
    console.error(
      `  mongodump --uri="mongodb://127.0.0.1:27017" --db=personal_tracker --out=backups/pre-meeting-migration-$(date +%Y%m%d-%H%M%S)\n`
    );
    process.exit(1);
  }

  const db = await getUnscopedDb();

  console.log("Creating indexes...");
  await db.collection("todos").createIndex({ profile_id: 1, source_meeting_id: 1 });
  console.log("  todos                { profile_id: 1, source_meeting_id: 1 }");

  await db.collection("meetings").createIndex({ profile_id: 1, series_id: 1, meeting_date: -1 });
  console.log("  meetings             { profile_id: 1, series_id: 1, meeting_date: -1 }");
  await db.collection("meetings").createIndex({ profile_id: 1, meeting_date: -1 });
  console.log("  meetings             { profile_id: 1, meeting_date: -1 }");

  await db.collection("meeting_series").createIndex({ profile_id: 1, archived: 1, updated_at: -1 });
  console.log("  meeting_series       { profile_id: 1, archived: 1, updated_at: -1 }");

  console.log("\nMigration complete.");
  const client = await clientPromise;
  await client.close();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
