#!/usr/bin/env tsx
/**
 * One-time seed: creates the "Bali 2026" trip under the personal profile
 * with the initial checklist (16 items, Parth / Simran ownership).
 *
 * Idempotent — re-runs skip items that already exist by name.
 *
 * REQUIRES a Mongo dump first — pass --i-have-backed-up to acknowledge.
 *
 * Run with: npx tsx scripts/seed-bali-2026.ts --i-have-backed-up
 */

import { randomUUID } from "node:crypto";
import { clientPromise, getUnscopedDb } from "../lib/db";

const TRIP_TITLE = "Bali 2026";
const DESTINATION = "Bali";
const COVER_EMOJI = "🏝️";
const TRAVELERS = ["Parth", "Simran"];

type SeedItem = {
  name: string;
  owner: "Parth" | "Simran";
  status: "yet_to_start" | "in_review" | "completed";
};

type SeedStay = {
  name: string;
  location: string;
};

type SeedActivity = {
  name: string;
  category:
    | "sight"
    | "food"
    | "beach"
    | "adventure"
    | "shopping"
    | "wellness"
    | "other";
  location?: string;
};

type SeedTransport = {
  mode: "flight" | "boat" | "car" | "transfer" | "train" | "other";
  from_loc?: string;
  to_loc?: string;
  provider?: string;
  notes?: string;
};

type SeedBudget = {
  category: string;
  label: string;
  estimated: number;
};

const STAYS: SeedStay[] = [
  { name: "Ubud villa — TBD", location: "Ubud" },
  { name: "Canggu stay — TBD", location: "Canggu" },
  { name: "Uluwatu cliff resort — TBD", location: "Uluwatu" },
];

const ACTIVITIES: SeedActivity[] = [
  { name: "Mount Batur sunrise trek", category: "adventure", location: "Kintamani" },
  { name: "Tegalalang rice terraces", category: "sight", location: "Ubud" },
  { name: "Tirta Empul water temple", category: "sight", location: "Ubud" },
  { name: "Sacred Monkey Forest", category: "sight", location: "Ubud" },
  { name: "Campuhan ridge walk at sunrise", category: "sight", location: "Ubud" },
  { name: "Uluwatu temple + Kecak fire dance", category: "sight", location: "Uluwatu" },
  { name: "Padang Padang beach", category: "beach", location: "Uluwatu" },
  { name: "Single Fin sunset session", category: "food", location: "Uluwatu" },
  { name: "Nusa Penida day trip (Kelingking, Broken Beach)", category: "adventure", location: "Nusa Penida" },
  { name: "Gili Trawangan / Gili Air overnight", category: "beach", location: "Gili Islands" },
  { name: "Snorkel with manta rays", category: "adventure", location: "Nusa Penida" },
  { name: "Sundara brunch", category: "food", location: "Jimbaran" },
  { name: "La Brisa beach club", category: "food", location: "Canggu" },
  { name: "Locavore / Hujan Locale dinner", category: "food", location: "Ubud" },
  { name: "Yoga + spa morning", category: "wellness", location: "Ubud" },
  { name: "Seminyak boutique shopping", category: "shopping", location: "Seminyak" },
];

const TRANSPORT: SeedTransport[] = [
  { mode: "flight", from_loc: "DEL", to_loc: "DPS", provider: "TBD — outbound" },
  { mode: "flight", from_loc: "DPS", to_loc: "DEL", provider: "TBD — return" },
  { mode: "boat", from_loc: "Sanur", to_loc: "Nusa Penida", provider: "Maruti / Angel Billabong fast boat" },
  { mode: "boat", from_loc: "Padangbai", to_loc: "Gili Trawangan", provider: "Eka Jaya / Blue Water Express" },
  { mode: "transfer", from_loc: "DPS Airport", to_loc: "Ubud", provider: "Pre-booked driver" },
];

const BUDGET: SeedBudget[] = [
  { category: "Transport", label: "Round-trip flights × 2", estimated: 80000 },
  { category: "Transport", label: "Airport + inter-area transfers", estimated: 10000 },
  { category: "Transport", label: "Speed boats (Penida + Gili)", estimated: 12000 },
  { category: "Stay", label: "Ubud — 3 nights", estimated: 18000 },
  { category: "Stay", label: "Canggu — 3 nights", estimated: 24000 },
  { category: "Stay", label: "Uluwatu — 2 nights", estimated: 22000 },
  { category: "Food", label: "Daily food + cafes (~₹2.5k/day)", estimated: 20000 },
  { category: "Activities", label: "Mount Batur trek + guide", estimated: 5000 },
  { category: "Activities", label: "Nusa Penida day tour", estimated: 6000 },
  { category: "Activities", label: "Spa / yoga / massages", estimated: 7000 },
  { category: "Shopping", label: "Clothes + souvenirs buffer", estimated: 10000 },
  { category: "Misc", label: "Visa-on-arrival + tourist tax", estimated: 4000 },
  { category: "Misc", label: "SIM / data + tips + buffer", estimated: 5000 },
];

const ITEMS: SeedItem[] = [
  { name: "Visa Process / Tourist tax / Customs / Health screening", owner: "Parth", status: "yet_to_start" },
  { name: "Flights", owner: "Simran", status: "completed" },
  { name: "Stay", owner: "Simran", status: "in_review" },
  { name: "Apps for Bali", owner: "Parth", status: "yet_to_start" },
  { name: "Payment ( Card / Cash )", owner: "Parth", status: "yet_to_start" },
  { name: "Budgetting", owner: "Simran", status: "yet_to_start" },
  { name: "Places to visit / Activities to do", owner: "Simran", status: "yet_to_start" },
  { name: "Food to try", owner: "Parth", status: "yet_to_start" },
  { name: "Combined Itinerary", owner: "Simran", status: "yet_to_start" },
  { name: "Speed boats bookings", owner: "Parth", status: "yet_to_start" },
  { name: "Outfit planning", owner: "Simran", status: "yet_to_start" },
  { name: "Get your guide + reaching out to brands", owner: "Simran", status: "yet_to_start" },
  { name: "Reel Ideas", owner: "Simran", status: "yet_to_start" },
  { name: "Sim / Network", owner: "Parth", status: "yet_to_start" },
  { name: "Travel Insurance", owner: "Parth", status: "yet_to_start" },
  { name: "Offline Maps", owner: "Parth", status: "yet_to_start" },
];

async function main() {
  if (!process.argv.includes("--i-have-backed-up")) {
    console.error("\nRefusing to run without --i-have-backed-up flag.\n");
    console.error("Before running, take a Mongo dump:");
    console.error(
      `  mongodump --uri="mongodb://127.0.0.1:27017" --db=personal_tracker --out=backups/pre-bali-seed-$(date +%Y%m%d-%H%M%S)\n`
    );
    process.exit(1);
  }

  const db = await getUnscopedDb();
  const profiles = db.collection<{ _id: string; slug: string }>("profiles");
  const personal = await profiles.findOne({ slug: "personal" });
  if (!personal) {
    console.error('Could not find profile with slug "personal".');
    process.exit(1);
  }

  const tripsCol = db.collection<Record<string, unknown>>("trips");
  const itemsCol = db.collection<Record<string, unknown>>("trip_items");
  const staysCol = db.collection<Record<string, unknown>>("trip_stays");
  const transportCol = db.collection<Record<string, unknown>>("trip_transport");
  const activitiesCol = db.collection<Record<string, unknown>>("trip_activities");
  const budgetCol = db.collection<Record<string, unknown>>("trip_budget_items");

  const existingTrip = await tripsCol.findOne({
    profile_id: personal._id,
    title: TRIP_TITLE,
  });

  let tripId: string;
  const now = new Date();
  if (existingTrip) {
    tripId = existingTrip._id as unknown as string;
    console.log(`Trip "${TRIP_TITLE}" already exists (${tripId}) — reusing.`);
    // Backfill new metadata fields if they were missing on existing trips.
    await tripsCol.updateOne(
      { _id: tripId } as unknown as Parameters<typeof tripsCol.updateOne>[0],
      {
        $set: {
          cover_emoji: existingTrip.cover_emoji ?? COVER_EMOJI,
          travelers:
            Array.isArray(existingTrip.travelers) && existingTrip.travelers.length > 0
              ? existingTrip.travelers
              : TRAVELERS,
          currency: existingTrip.currency ?? "INR",
          notes: existingTrip.notes ?? "",
          updated_at: now,
        },
      }
    );
    console.log("  backfilled cover_emoji / travelers / currency / notes");
  } else {
    tripId = randomUUID();
    await tripsCol.insertOne({
      _id: tripId,
      profile_id: personal._id,
      title: TRIP_TITLE,
      destination: DESTINATION,
      cover_emoji: COVER_EMOJI,
      travelers: TRAVELERS,
      currency: "INR",
      notes: "",
      start_date: null,
      end_date: null,
      archived: false,
      created_at: now,
      updated_at: now,
    } as unknown as Parameters<typeof tripsCol.insertOne>[0]);
    console.log(`Created trip "${TRIP_TITLE}" (${tripId}).`);
  }

  let inserted = 0;
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    const existing = await itemsCol.findOne({
      profile_id: personal._id,
      trip_id: tripId,
      name: it.name,
    });
    if (existing) {
      console.log(`  skip (exists): ${it.name}`);
      continue;
    }
    await itemsCol.insertOne({
      _id: randomUUID(),
      profile_id: personal._id,
      trip_id: tripId,
      name: it.name,
      owner: it.owner,
      status: it.status,
      notes: null,
      sort_order: i,
      created_at: now,
      updated_at: now,
    } as unknown as Parameters<typeof itemsCol.insertOne>[0]);
    console.log(`  add: ${it.name}  [${it.owner} · ${it.status}]`);
    inserted++;
  }

  console.log(`\nDone. Inserted ${inserted} new prep item${inserted === 1 ? "" : "s"}.`);

  // ---- Sample stays
  let staysAdded = 0;
  for (let i = 0; i < STAYS.length; i++) {
    const s = STAYS[i];
    const ex = await staysCol.findOne({
      profile_id: personal._id,
      trip_id: tripId,
      name: s.name,
    });
    if (ex) continue;
    await staysCol.insertOne({
      _id: randomUUID(),
      profile_id: personal._id,
      trip_id: tripId,
      name: s.name,
      location: s.location,
      check_in: null,
      check_out: null,
      url: null,
      confirmation: null,
      cost: null,
      notes: "",
      sort_order: i,
      created_at: now,
      updated_at: now,
    } as unknown as Parameters<typeof staysCol.insertOne>[0]);
    staysAdded++;
  }
  console.log(`Seeded ${staysAdded} stay placeholder${staysAdded === 1 ? "" : "s"}.`);

  // ---- Sample transport legs
  let transportAdded = 0;
  for (let i = 0; i < TRANSPORT.length; i++) {
    const t = TRANSPORT[i];
    const ex = await transportCol.findOne({
      profile_id: personal._id,
      trip_id: tripId,
      mode: t.mode,
      from_loc: t.from_loc ?? null,
      to_loc: t.to_loc ?? null,
      provider: t.provider ?? null,
    });
    if (ex) continue;
    await transportCol.insertOne({
      _id: randomUUID(),
      profile_id: personal._id,
      trip_id: tripId,
      mode: t.mode,
      from_loc: t.from_loc ?? null,
      to_loc: t.to_loc ?? null,
      depart_at: null,
      arrive_at: null,
      provider: t.provider ?? null,
      ref: null,
      url: null,
      cost: null,
      notes: t.notes ?? "",
      sort_order: i,
      created_at: now,
      updated_at: now,
    } as unknown as Parameters<typeof transportCol.insertOne>[0]);
    transportAdded++;
  }
  console.log(`Seeded ${transportAdded} transport leg${transportAdded === 1 ? "" : "s"}.`);

  // ---- Sample activities (wishlist)
  let activitiesAdded = 0;
  for (let i = 0; i < ACTIVITIES.length; i++) {
    const a = ACTIVITIES[i];
    const ex = await activitiesCol.findOne({
      profile_id: personal._id,
      trip_id: tripId,
      name: a.name,
    });
    if (ex) continue;
    await activitiesCol.insertOne({
      _id: randomUUID(),
      profile_id: personal._id,
      trip_id: tripId,
      name: a.name,
      category: a.category,
      day_index: null,
      time: null,
      location: a.location ?? null,
      url: null,
      cost: null,
      status: "wishlist",
      notes: "",
      sort_order: i,
      created_at: now,
      updated_at: now,
    } as unknown as Parameters<typeof activitiesCol.insertOne>[0]);
    activitiesAdded++;
  }
  console.log(`Seeded ${activitiesAdded} activity wishlist item${activitiesAdded === 1 ? "" : "s"}.`);

  // ---- Budget skeleton
  let budgetAdded = 0;
  for (let i = 0; i < BUDGET.length; i++) {
    const b = BUDGET[i];
    const ex = await budgetCol.findOne({
      profile_id: personal._id,
      trip_id: tripId,
      label: b.label,
    });
    if (ex) continue;
    await budgetCol.insertOne({
      _id: randomUUID(),
      profile_id: personal._id,
      trip_id: tripId,
      category: b.category,
      label: b.label,
      estimated: b.estimated,
      actual: null,
      paid_by: null,
      notes: "",
      sort_order: i,
      created_at: now,
      updated_at: now,
    } as unknown as Parameters<typeof budgetCol.insertOne>[0]);
    budgetAdded++;
  }
  console.log(`Seeded ${budgetAdded} budget line${budgetAdded === 1 ? "" : "s"}.`);

  console.log("\nCreating indexes...");
  await db
    .collection("trips")
    .createIndex({ profile_id: 1, archived: 1, updated_at: -1 });
  console.log("  trips                { profile_id: 1, archived: 1, updated_at: -1 }");
  await db
    .collection("trip_items")
    .createIndex({ profile_id: 1, trip_id: 1, sort_order: 1 });
  console.log("  trip_items           { profile_id: 1, trip_id: 1, sort_order: 1 }");
  await db
    .collection("trip_stays")
    .createIndex({ profile_id: 1, trip_id: 1, check_in: 1 });
  console.log("  trip_stays           { profile_id: 1, trip_id: 1, check_in: 1 }");
  await db
    .collection("trip_transport")
    .createIndex({ profile_id: 1, trip_id: 1, depart_at: 1 });
  console.log("  trip_transport       { profile_id: 1, trip_id: 1, depart_at: 1 }");
  await db
    .collection("trip_activities")
    .createIndex({ profile_id: 1, trip_id: 1, day_index: 1, sort_order: 1 });
  console.log("  trip_activities      { profile_id: 1, trip_id: 1, day_index: 1, sort_order: 1 }");
  await db
    .collection("trip_budget_items")
    .createIndex({ profile_id: 1, trip_id: 1, category: 1, sort_order: 1 });
  console.log("  trip_budget_items    { profile_id: 1, trip_id: 1, category: 1, sort_order: 1 }");

  const client = await clientPromise;
  await client.close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
