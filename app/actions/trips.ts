"use server";

import { revalidatePath } from "next/cache";
import * as trips from "@/lib/repositories/trips";

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
