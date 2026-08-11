import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import { TripSchema, type Trip, type TripInput, type TripPatch } from "@/lib/schemas";
import { listSections, removeSection } from "@/lib/repositories/trip-sections";

const TRIPS_COLLECTION = "trips";

async function tripsCol() {
  return getCollection<Trip>(TRIPS_COLLECTION);
}

// ---------- Trips ----------

export async function listTrips(opts?: {
  archived?: boolean;
}): Promise<Trip[]> {
  const col = await tripsCol();
  const filter: Filter<Trip> = {};
  if (opts?.archived !== undefined) filter.archived = opts.archived;
  const docs = await col.find(filter).sort({ updated_at: -1 }).toArray();
  return docs.map((d) => TripSchema.parse(d));
}

export async function getTrip(id: string): Promise<Trip | null> {
  const col = await tripsCol();
  const doc = await col.findOne({ _id: id } as Filter<Trip>);
  return doc ? TripSchema.parse(doc) : null;
}

export async function createTrip(input: TripInput): Promise<Trip> {
  const col = await tripsCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const trip: Trip = {
    _id: randomUUID(),
    profile_id: profileId,
    title: input.title,
    destination: input.destination ?? null,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    travelers: input.travelers ?? [],
    cover_emoji: input.cover_emoji ?? null,
    currency: input.currency ?? "INR",
    notes: "",
    archived: false,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(trip);
  return trip;
}

export async function updateTrip(
  id: string,
  patch: TripPatch
): Promise<Trip | null> {
  const col = await tripsCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<Trip>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? TripSchema.parse(result) : null;
}

export async function removeTrip(id: string): Promise<boolean> {
  const sections = await listSections(id);
  for (const s of sections.filter((s) => s.parent_id === null)) {
    await removeSection(s._id);
  }
  const col = await tripsCol();
  const result = await col.deleteOne({ _id: id } as Filter<Trip>);
  return result.deletedCount === 1;
}
