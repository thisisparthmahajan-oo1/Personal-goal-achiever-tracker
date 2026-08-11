"use server";

import { revalidatePath } from "next/cache";
import * as sections from "@/lib/repositories/trip-sections";
import type {
  TripSectionItemStatus,
  TripSectionContentType,
  SpotCategory,
  SpotPriority,
  MealTag,
} from "@/lib/schemas";

function pathsForTrip(tripId: string) {
  return ["/library/trips", `/library/trips/${tripId}`];
}

const STATUS_ORDER: TripSectionItemStatus[] = [
  "yet_to_start",
  "in_review",
  "completed",
];

// ---------- Sections ----------

export async function createSectionAction(input: {
  trip_id: string;
  name: string;
  parent_id?: string | null;
  content_type?: TripSectionContentType;
}) {
  const name = input.name.trim();
  if (!name) return;
  await sections.createSection(input.trip_id, {
    name,
    parent_id: input.parent_id ?? null,
    content_type: input.content_type,
  });
  for (const p of pathsForTrip(input.trip_id)) revalidatePath(p);
}

export async function renameSectionAction(
  sectionId: string,
  tripId: string,
  name: string
) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await sections.updateSection(sectionId, { name: trimmed });
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}

export async function deleteSectionAction(sectionId: string, tripId: string) {
  await sections.removeSection(sectionId);
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}

export async function reorderSectionsAction(ids: string[], tripId: string) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  await sections.setSectionOrder(ids);
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}

// ---------- Items ----------

export async function createSectionItemAction(input: {
  trip_id: string;
  section_id: string;
  name: string;
}) {
  const name = input.name.trim();
  if (!name) return;
  await sections.createItem(input.trip_id, input.section_id, { name });
  for (const p of pathsForTrip(input.trip_id)) revalidatePath(p);
}

export async function updateSectionItemAction(
  itemId: string,
  tripId: string,
  patch: {
    name?: string;
    status?: TripSectionItemStatus;
    due_date?: Date | string | null;
    notes?: string | null;
  }
) {
  const next: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return;
    next.name = n;
  }
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.due_date !== undefined)
    next.due_date = patch.due_date ? new Date(patch.due_date) : null;
  if (patch.notes !== undefined) next.notes = patch.notes;
  await sections.updateItem(itemId, next);
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}

export async function cycleSectionItemStatusAction(
  itemId: string,
  tripId: string
) {
  const existing = await sections.getItem(itemId);
  if (!existing) return;
  const idx = STATUS_ORDER.indexOf(existing.status);
  const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
  await sections.updateItem(itemId, { status: next });
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}

export async function deleteSectionItemAction(itemId: string, tripId: string) {
  await sections.removeItem(itemId);
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}

// ---------- Spots ----------

export async function createSpotAction(input: {
  trip_id: string;
  section_id: string;
  name: string;
}) {
  const name = input.name.trim();
  if (!name) return;
  await sections.createSpot(input.trip_id, input.section_id, { name });
  for (const p of pathsForTrip(input.trip_id)) revalidatePath(p);
}

export async function updateSpotAction(
  spotId: string,
  tripId: string,
  patch: {
    name?: string;
    category?: SpotCategory;
    priority?: SpotPriority;
    meal_tags?: MealTag[];
    dishes?: string | null;
    link?: string | null;
    notes?: string | null;
  }
) {
  const next: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return;
    next.name = n;
  }
  if (patch.category !== undefined) next.category = patch.category;
  if (patch.priority !== undefined) next.priority = patch.priority;
  if (patch.meal_tags !== undefined) next.meal_tags = patch.meal_tags;
  if (patch.dishes !== undefined) next.dishes = patch.dishes?.trim() || null;
  if (patch.link !== undefined) next.link = patch.link?.trim() || null;
  if (patch.notes !== undefined) next.notes = patch.notes;
  await sections.updateSpot(spotId, next);
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}

export async function deleteSpotAction(spotId: string, tripId: string) {
  await sections.removeSpot(spotId);
  for (const p of pathsForTrip(tripId)) revalidatePath(p);
}
