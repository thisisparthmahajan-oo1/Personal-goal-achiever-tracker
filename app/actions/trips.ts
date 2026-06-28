"use server";

import { revalidatePath } from "next/cache";
import * as trips from "@/lib/repositories/trips";
import type {
  TripItemStatus,
  TripStayPatch,
  TripTransportPatch,
  TripActivityPatch,
  TripBudgetItemPatch,
  TransportMode,
  ActivityCategory,
  ActivityStatus,
} from "@/lib/schemas";

function pathsForTrip(tripId: string) {
  return ["/library", "/library/trips", `/library/trips/${tripId}`];
}

// ---------- Trips ----------

export async function createTripAction(input: {
  title: string;
  destination?: string | null;
}) {
  const title = input.title.trim();
  if (!title) return;
  const trip = await trips.createTrip({
    title,
    destination: input.destination?.trim() || null,
  });
  revalidatePath("/library");
  revalidatePath("/library/trips");
  return trip;
}

export async function updateTripAction(
  id: string,
  patch: {
    title?: string;
    destination?: string | null;
    start_date?: Date | string | null;
    end_date?: Date | string | null;
    travelers?: string[];
    cover_emoji?: string | null;
    notes?: string;
    currency?: string;
    archived?: boolean;
  }
) {
  const next: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return;
    next.title = t;
  }
  if (patch.destination !== undefined) {
    next.destination = patch.destination?.trim() || null;
  }
  if (patch.start_date !== undefined) {
    next.start_date = patch.start_date ? new Date(patch.start_date) : null;
  }
  if (patch.end_date !== undefined) {
    next.end_date = patch.end_date ? new Date(patch.end_date) : null;
  }
  if (patch.travelers !== undefined) next.travelers = patch.travelers;
  if (patch.cover_emoji !== undefined)
    next.cover_emoji = patch.cover_emoji?.trim() || null;
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.currency !== undefined) next.currency = patch.currency;
  if (patch.archived !== undefined) next.archived = patch.archived;
  await trips.updateTrip(id, next);
  for (const p of pathsForTrip(id)) revalidatePath(p);
}

export async function deleteTripAction(id: string) {
  await trips.removeTrip(id);
  revalidatePath("/library");
  revalidatePath("/library/trips");
}

// ---------- Trip items ----------

const STATUS_ORDER: TripItemStatus[] = [
  "yet_to_start",
  "in_review",
  "completed",
];

export async function createTripItemAction(input: {
  trip_id: string;
  name: string;
  owner?: string | null;
}) {
  const name = input.name.trim();
  if (!name) return;
  await trips.createItem(input.trip_id, {
    name,
    owner: input.owner?.trim() || null,
    status: "yet_to_start",
  });
  for (const p of pathsForTrip(input.trip_id)) revalidatePath(p);
}

export async function updateTripItemAction(
  itemId: string,
  patch: {
    name?: string;
    owner?: string | null;
    status?: TripItemStatus;
    notes?: string | null;
    due_date?: Date | string | null;
  }
) {
  const existing = await trips.getItem(itemId);
  if (!existing) return;
  const next: {
    name?: string;
    owner?: string | null;
    status?: TripItemStatus;
    notes?: string | null;
    due_date?: Date | null;
  } = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return;
    next.name = n;
  }
  if (patch.owner !== undefined) next.owner = patch.owner?.trim() || null;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.due_date !== undefined)
    next.due_date = patch.due_date ? new Date(patch.due_date) : null;
  await trips.updateItem(itemId, next);
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

export async function cycleTripItemStatusAction(itemId: string) {
  const existing = await trips.getItem(itemId);
  if (!existing) return;
  const idx = STATUS_ORDER.indexOf(existing.status);
  const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
  await trips.updateItem(itemId, { status: next });
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

export async function deleteTripItemAction(itemId: string) {
  const existing = await trips.getItem(itemId);
  if (!existing) return;
  await trips.removeItem(itemId);
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

export async function reorderTripItemsAction(
  tripId: string,
  ids: string[]
) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  await trips.setItemOrder(ids);
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}

// ---------- Stays ----------

export async function createStayAction(input: {
  trip_id: string;
  name: string;
  location?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  url?: string | null;
  cost?: number | null;
}) {
  const name = input.name.trim();
  if (!name) return;
  await trips.createStay(input.trip_id, {
    name,
    location: input.location?.trim() || null,
    check_in: input.check_in ? new Date(input.check_in) : null,
    check_out: input.check_out ? new Date(input.check_out) : null,
    url: input.url?.trim() || null,
    cost: typeof input.cost === "number" ? input.cost : null,
  });
  for (const p of pathsForTrip(input.trip_id)) revalidatePath(p);
}

export async function updateStayAction(
  stayId: string,
  patch: {
    name?: string;
    location?: string | null;
    check_in?: Date | string | null;
    check_out?: Date | string | null;
    url?: string | null;
    confirmation?: string | null;
    cost?: number | null;
    notes?: string;
  }
) {
  const existing = await trips.getStay(stayId);
  if (!existing) return;
  const next: TripStayPatch = {};
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.location !== undefined) next.location = patch.location?.toString().trim() || null;
  if (patch.check_in !== undefined)
    next.check_in = patch.check_in ? new Date(patch.check_in) : null;
  if (patch.check_out !== undefined)
    next.check_out = patch.check_out ? new Date(patch.check_out) : null;
  if (patch.url !== undefined) next.url = patch.url?.toString().trim() || null;
  if (patch.confirmation !== undefined)
    next.confirmation = patch.confirmation?.toString().trim() || null;
  if (patch.cost !== undefined)
    next.cost = patch.cost === null ? null : Number(patch.cost);
  if (patch.notes !== undefined) next.notes = patch.notes;
  await trips.updateStay(stayId, next);
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

export async function deleteStayAction(stayId: string) {
  const existing = await trips.getStay(stayId);
  if (!existing) return;
  await trips.removeStay(stayId);
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

// ---------- Transport ----------

export async function createTransportAction(input: {
  trip_id: string;
  mode?: TransportMode;
  from_loc?: string | null;
  to_loc?: string | null;
  depart_at?: string | null;
  arrive_at?: string | null;
  provider?: string | null;
  ref?: string | null;
  url?: string | null;
  cost?: number | null;
}) {
  await trips.createTransport(input.trip_id, {
    mode: input.mode ?? "flight",
    from_loc: input.from_loc?.trim() || null,
    to_loc: input.to_loc?.trim() || null,
    depart_at: input.depart_at ? new Date(input.depart_at) : null,
    arrive_at: input.arrive_at ? new Date(input.arrive_at) : null,
    provider: input.provider?.trim() || null,
    ref: input.ref?.trim() || null,
    url: input.url?.trim() || null,
    cost: typeof input.cost === "number" ? input.cost : null,
  });
  for (const p of pathsForTrip(input.trip_id)) revalidatePath(p);
}

export async function updateTransportAction(
  transportId: string,
  patch: {
    mode?: TransportMode;
    from_loc?: string | null;
    to_loc?: string | null;
    depart_at?: Date | string | null;
    arrive_at?: Date | string | null;
    provider?: string | null;
    ref?: string | null;
    url?: string | null;
    cost?: number | null;
    notes?: string;
  }
) {
  const existing = await trips.getTransport(transportId);
  if (!existing) return;
  const next: TripTransportPatch = {};
  if (patch.mode !== undefined) next.mode = patch.mode;
  if (patch.from_loc !== undefined) next.from_loc = patch.from_loc?.toString().trim() || null;
  if (patch.to_loc !== undefined) next.to_loc = patch.to_loc?.toString().trim() || null;
  if (patch.depart_at !== undefined)
    next.depart_at = patch.depart_at ? new Date(patch.depart_at) : null;
  if (patch.arrive_at !== undefined)
    next.arrive_at = patch.arrive_at ? new Date(patch.arrive_at) : null;
  if (patch.provider !== undefined) next.provider = patch.provider?.toString().trim() || null;
  if (patch.ref !== undefined) next.ref = patch.ref?.toString().trim() || null;
  if (patch.url !== undefined) next.url = patch.url?.toString().trim() || null;
  if (patch.cost !== undefined)
    next.cost = patch.cost === null ? null : Number(patch.cost);
  if (patch.notes !== undefined) next.notes = patch.notes;
  await trips.updateTransport(transportId, next);
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

export async function deleteTransportAction(transportId: string) {
  const existing = await trips.getTransport(transportId);
  if (!existing) return;
  await trips.removeTransport(transportId);
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

// ---------- Activities ----------

export async function createActivityAction(input: {
  trip_id: string;
  name: string;
  category?: ActivityCategory;
  day_index?: number | null;
  time?: string | null;
  location?: string | null;
  url?: string | null;
  cost?: number | null;
}) {
  const name = input.name.trim();
  if (!name) return;
  await trips.createActivity(input.trip_id, {
    name,
    category: input.category ?? "other",
    day_index: input.day_index ?? null,
    time: input.time?.trim() || null,
    location: input.location?.trim() || null,
    url: input.url?.trim() || null,
    cost: typeof input.cost === "number" ? input.cost : null,
  });
  for (const p of pathsForTrip(input.trip_id)) revalidatePath(p);
}

export async function updateActivityAction(
  activityId: string,
  patch: TripActivityPatch
) {
  const existing = await trips.getActivity(activityId);
  if (!existing) return;
  const next: TripActivityPatch = {};
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.category !== undefined) next.category = patch.category;
  if (patch.day_index !== undefined) next.day_index = patch.day_index;
  if (patch.time !== undefined) next.time = patch.time?.toString().trim() || null;
  if (patch.location !== undefined) next.location = patch.location?.toString().trim() || null;
  if (patch.url !== undefined) next.url = patch.url?.toString().trim() || null;
  if (patch.cost !== undefined)
    next.cost = patch.cost === null ? null : Number(patch.cost);
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.notes !== undefined) next.notes = patch.notes;
  await trips.updateActivity(activityId, next);
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

const ACTIVITY_STATUS_ORDER: ActivityStatus[] = ["wishlist", "booked", "done"];

export async function cycleActivityStatusAction(activityId: string) {
  const existing = await trips.getActivity(activityId);
  if (!existing) return;
  const idx = ACTIVITY_STATUS_ORDER.indexOf(existing.status);
  const next = ACTIVITY_STATUS_ORDER[(idx + 1) % ACTIVITY_STATUS_ORDER.length];
  await trips.updateActivity(activityId, { status: next });
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

export async function deleteActivityAction(activityId: string) {
  const existing = await trips.getActivity(activityId);
  if (!existing) return;
  await trips.removeActivity(activityId);
  for (const p of pathsForTrip(existing.trip_id)) revalidatePath(p);
}

// ---------- Budget ----------

export async function createBudgetItemAction(input: {
  trip_id: string;
  category?: string;
  label: string;
  estimated?: number;
  actual?: number | null;
  paid_by?: string | null;
}) {
  const label = input.label.trim();
  if (!label) return;
  await trips.createBudgetItem(input.trip_id, {
    category: input.category?.trim() || "Misc",
    label,
    estimated: input.estimated ?? 0,
    actual: input.actual ?? null,
    paid_by: input.paid_by?.trim() || null,
  });
  for (const p of pathsForTrip(input.trip_id)) revalidatePath(p);
}

export async function updateBudgetItemAction(
  budgetId: string,
  patch: TripBudgetItemPatch & { trip_id: string }
) {
  const next: TripBudgetItemPatch = {};
  if (patch.category !== undefined) next.category = patch.category;
  if (patch.label !== undefined) next.label = patch.label.trim();
  if (patch.estimated !== undefined) next.estimated = Number(patch.estimated);
  if (patch.actual !== undefined)
    next.actual = patch.actual === null ? null : Number(patch.actual);
  if (patch.paid_by !== undefined) next.paid_by = patch.paid_by;
  if (patch.notes !== undefined) next.notes = patch.notes;
  await trips.updateBudgetItem(budgetId, next);
  for (const p of pathsForTrip(patch.trip_id)) revalidatePath(p);
}

export async function deleteBudgetItemAction(
  budgetId: string,
  tripId: string
) {
  await trips.removeBudgetItem(budgetId);
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}

// ---------- Trip notes (rich text) ----------

export async function setTripNotesAction(tripId: string, notes: string) {
  await trips.updateTrip(tripId, { notes });
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}
