import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import {
  TripSchema,
  TripItemSchema,
  TripStaySchema,
  TripTransportSchema,
  TripActivitySchema,
  TripBudgetItemSchema,
  type Trip,
  type TripInput,
  type TripPatch,
  type TripItem,
  type TripItemInput,
  type TripItemPatch,
  type TripStay,
  type TripStayPatch,
  type TripTransport,
  type TripTransportPatch,
  type TripActivity,
  type TripActivityPatch,
  type TripBudgetItem,
  type TripBudgetItemPatch,
} from "@/lib/schemas";

const TRIPS_COLLECTION = "trips";
const TRIP_ITEMS_COLLECTION = "trip_items";
const TRIP_STAYS_COLLECTION = "trip_stays";
const TRIP_TRANSPORT_COLLECTION = "trip_transport";
const TRIP_ACTIVITIES_COLLECTION = "trip_activities";
const TRIP_BUDGET_COLLECTION = "trip_budget_items";

async function tripsCol() {
  return getCollection<Trip>(TRIPS_COLLECTION);
}

async function itemsCol() {
  return getCollection<TripItem>(TRIP_ITEMS_COLLECTION);
}

async function staysCol() {
  return getCollection<TripStay>(TRIP_STAYS_COLLECTION);
}

async function transportCol() {
  return getCollection<TripTransport>(TRIP_TRANSPORT_COLLECTION);
}

async function activitiesCol() {
  return getCollection<TripActivity>(TRIP_ACTIVITIES_COLLECTION);
}

async function budgetCol() {
  return getCollection<TripBudgetItem>(TRIP_BUDGET_COLLECTION);
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

/**
 * Removes a trip and everything attached to it.
 */
export async function removeTrip(id: string): Promise<boolean> {
  await (await itemsCol()).deleteMany({ trip_id: id } as Filter<TripItem>);
  await (await staysCol()).deleteMany({ trip_id: id } as Filter<TripStay>);
  await (
    await transportCol()
  ).deleteMany({ trip_id: id } as Filter<TripTransport>);
  await (
    await activitiesCol()
  ).deleteMany({ trip_id: id } as Filter<TripActivity>);
  await (
    await budgetCol()
  ).deleteMany({ trip_id: id } as Filter<TripBudgetItem>);
  const col = await tripsCol();
  const result = await col.deleteOne({ _id: id } as Filter<Trip>);
  return result.deletedCount === 1;
}

async function bumpTrip(tripId: string, now: Date) {
  const trips = await tripsCol();
  await trips.updateOne(
    { _id: tripId } as Filter<Trip>,
    { $set: { updated_at: now } }
  );
}

export async function countItems(tripId: string): Promise<{
  total: number;
  completed: number;
}> {
  const col = await itemsCol();
  const [total, completed] = await Promise.all([
    col.countDocuments({ trip_id: tripId } as Filter<TripItem>),
    col.countDocuments({
      trip_id: tripId,
      status: "completed",
    } as Filter<TripItem>),
  ]);
  return { total, completed };
}

// ---------- Trip items ----------

export async function listItems(tripId: string): Promise<TripItem[]> {
  const col = await itemsCol();
  const docs = await col
    .find({ trip_id: tripId } as Filter<TripItem>)
    .sort({ sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map((d) => TripItemSchema.parse(d));
}

export async function getItem(id: string): Promise<TripItem | null> {
  const col = await itemsCol();
  const doc = await col.findOne({ _id: id } as Filter<TripItem>);
  return doc ? TripItemSchema.parse(doc) : null;
}

export async function createItem(
  tripId: string,
  input: TripItemInput
): Promise<TripItem> {
  const col = await itemsCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const item: TripItem = {
    _id: randomUUID(),
    profile_id: profileId,
    trip_id: tripId,
    name: input.name,
    owner: input.owner ?? null,
    status: input.status ?? "yet_to_start",
    notes: null,
    due_date: null,
    sort_order: now.getTime(),
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(item);
  // Bump the parent trip's updated_at so it floats to the top.
  const trips = await tripsCol();
  await trips.updateOne(
    { _id: tripId } as Filter<Trip>,
    { $set: { updated_at: now } }
  );
  return item;
}

export async function updateItem(
  id: string,
  patch: TripItemPatch
): Promise<TripItem | null> {
  const col = await itemsCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<TripItem>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? TripItemSchema.parse(result) : null;
}

export async function removeItem(id: string): Promise<boolean> {
  const col = await itemsCol();
  const result = await col.deleteOne({ _id: id } as Filter<TripItem>);
  return result.deletedCount === 1;
}

export async function setItemOrder(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const col = await itemsCol();
  const now = new Date();
  await Promise.all(
    ids.map((id, idx) =>
      col.updateOne(
        { _id: id } as Filter<TripItem>,
        { $set: { sort_order: idx, updated_at: now } }
      )
    )
  );
}

// ---------- Stays ----------

export async function listStays(tripId: string): Promise<TripStay[]> {
  const col = await staysCol();
  const docs = await col
    .find({ trip_id: tripId } as Filter<TripStay>)
    .sort({ check_in: 1, sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map((d) => TripStaySchema.parse(d));
}

export async function getStay(id: string): Promise<TripStay | null> {
  const col = await staysCol();
  const doc = await col.findOne({ _id: id } as Filter<TripStay>);
  return doc ? TripStaySchema.parse(doc) : null;
}

export async function createStay(
  tripId: string,
  input: { name: string; location?: string | null; check_in?: Date | null; check_out?: Date | null; url?: string | null; cost?: number | null }
): Promise<TripStay> {
  const col = await staysCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const stay: TripStay = {
    _id: randomUUID(),
    profile_id: profileId,
    trip_id: tripId,
    name: input.name,
    location: input.location ?? null,
    check_in: input.check_in ?? null,
    check_out: input.check_out ?? null,
    url: input.url ?? null,
    confirmation: null,
    cost: input.cost ?? null,
    notes: "",
    sort_order: now.getTime(),
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(stay);
  await bumpTrip(tripId, now);
  return stay;
}

export async function updateStay(id: string, patch: TripStayPatch): Promise<TripStay | null> {
  const col = await staysCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<TripStay>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? TripStaySchema.parse(result) : null;
}

export async function removeStay(id: string): Promise<boolean> {
  const col = await staysCol();
  const result = await col.deleteOne({ _id: id } as Filter<TripStay>);
  return result.deletedCount === 1;
}

// ---------- Transport ----------

export async function listTransport(tripId: string): Promise<TripTransport[]> {
  const col = await transportCol();
  const docs = await col
    .find({ trip_id: tripId } as Filter<TripTransport>)
    .sort({ depart_at: 1, sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map((d) => TripTransportSchema.parse(d));
}

export async function getTransport(id: string): Promise<TripTransport | null> {
  const col = await transportCol();
  const doc = await col.findOne({ _id: id } as Filter<TripTransport>);
  return doc ? TripTransportSchema.parse(doc) : null;
}

export async function createTransport(
  tripId: string,
  input: Partial<Omit<TripTransport, "_id" | "profile_id" | "trip_id" | "created_at" | "updated_at" | "sort_order">> & { mode?: TripTransport["mode"] }
): Promise<TripTransport> {
  const col = await transportCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const t: TripTransport = {
    _id: randomUUID(),
    profile_id: profileId,
    trip_id: tripId,
    mode: input.mode ?? "flight",
    from_loc: input.from_loc ?? null,
    to_loc: input.to_loc ?? null,
    depart_at: input.depart_at ?? null,
    arrive_at: input.arrive_at ?? null,
    provider: input.provider ?? null,
    ref: input.ref ?? null,
    url: input.url ?? null,
    cost: input.cost ?? null,
    notes: input.notes ?? "",
    sort_order: now.getTime(),
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(t);
  await bumpTrip(tripId, now);
  return t;
}

export async function updateTransport(id: string, patch: TripTransportPatch): Promise<TripTransport | null> {
  const col = await transportCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<TripTransport>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? TripTransportSchema.parse(result) : null;
}

export async function removeTransport(id: string): Promise<boolean> {
  const col = await transportCol();
  const result = await col.deleteOne({ _id: id } as Filter<TripTransport>);
  return result.deletedCount === 1;
}

// ---------- Activities ----------

export async function listActivities(tripId: string): Promise<TripActivity[]> {
  const col = await activitiesCol();
  const docs = await col
    .find({ trip_id: tripId } as Filter<TripActivity>)
    .sort({ sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map((d) => TripActivitySchema.parse(d));
}

export async function getActivity(id: string): Promise<TripActivity | null> {
  const col = await activitiesCol();
  const doc = await col.findOne({ _id: id } as Filter<TripActivity>);
  return doc ? TripActivitySchema.parse(doc) : null;
}

export async function createActivity(
  tripId: string,
  input: { name: string; category?: TripActivity["category"]; day_index?: number | null; time?: string | null; location?: string | null; url?: string | null; cost?: number | null }
): Promise<TripActivity> {
  const col = await activitiesCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const a: TripActivity = {
    _id: randomUUID(),
    profile_id: profileId,
    trip_id: tripId,
    name: input.name,
    category: input.category ?? "other",
    day_index: input.day_index ?? null,
    time: input.time ?? null,
    location: input.location ?? null,
    url: input.url ?? null,
    cost: input.cost ?? null,
    status: "wishlist",
    notes: "",
    sort_order: now.getTime(),
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(a);
  await bumpTrip(tripId, now);
  return a;
}

export async function updateActivity(id: string, patch: TripActivityPatch): Promise<TripActivity | null> {
  const col = await activitiesCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<TripActivity>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? TripActivitySchema.parse(result) : null;
}

export async function removeActivity(id: string): Promise<boolean> {
  const col = await activitiesCol();
  const result = await col.deleteOne({ _id: id } as Filter<TripActivity>);
  return result.deletedCount === 1;
}

// ---------- Budget ----------

export async function listBudget(tripId: string): Promise<TripBudgetItem[]> {
  const col = await budgetCol();
  const docs = await col
    .find({ trip_id: tripId } as Filter<TripBudgetItem>)
    .sort({ category: 1, sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map((d) => TripBudgetItemSchema.parse(d));
}

export async function createBudgetItem(
  tripId: string,
  input: { category?: string; label: string; estimated?: number; actual?: number | null; paid_by?: string | null }
): Promise<TripBudgetItem> {
  const col = await budgetCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const b: TripBudgetItem = {
    _id: randomUUID(),
    profile_id: profileId,
    trip_id: tripId,
    category: input.category ?? "Misc",
    label: input.label,
    estimated: input.estimated ?? 0,
    actual: input.actual ?? null,
    paid_by: input.paid_by ?? null,
    notes: "",
    sort_order: now.getTime(),
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(b);
  await bumpTrip(tripId, now);
  return b;
}

export async function updateBudgetItem(
  id: string,
  patch: TripBudgetItemPatch
): Promise<TripBudgetItem | null> {
  const col = await budgetCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<TripBudgetItem>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? TripBudgetItemSchema.parse(result) : null;
}

export async function removeBudgetItem(id: string): Promise<boolean> {
  const col = await budgetCol();
  const result = await col.deleteOne({ _id: id } as Filter<TripBudgetItem>);
  return result.deletedCount === 1;
}
