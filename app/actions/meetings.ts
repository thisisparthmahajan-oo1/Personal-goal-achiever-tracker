"use server";

import { revalidatePath } from "next/cache";
import * as meetings from "@/lib/repositories/meetings";
import * as todos from "@/lib/repositories/todos";

function pathsForMeeting(seriesId: string | null, meetingId: string) {
  const paths = [
    "/library",
    "/library/meetings",
    `/library/meetings/${meetingId}`,
    "/todos",
  ];
  if (seriesId) paths.push(`/library/meetings/series/${seriesId}`);
  return paths;
}

// ---------- Series ----------

export async function createMeetingSeriesAction(input: {
  title: string;
  cadence_label?: string | null;
  default_attendees?: string | null;
}) {
  const title = input.title.trim();
  if (!title) return;
  const series = await meetings.createSeries({
    title,
    cadence_label: input.cadence_label?.trim() || null,
    default_attendees: input.default_attendees?.trim() || null,
  });
  revalidatePath("/library");
  revalidatePath("/library/meetings");
  return series;
}

export async function updateMeetingSeriesAction(
  id: string,
  patch: {
    title?: string;
    cadence_label?: string | null;
    default_attendees?: string | null;
  }
) {
  const next: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return;
    next.title = t;
  }
  if (patch.cadence_label !== undefined) {
    next.cadence_label = patch.cadence_label?.trim() || null;
  }
  if (patch.default_attendees !== undefined) {
    next.default_attendees = patch.default_attendees?.trim() || null;
  }
  await meetings.updateSeries(id, next);
  revalidatePath("/library/meetings");
  revalidatePath(`/library/meetings/series/${id}`);
}

export async function archiveMeetingSeriesAction(
  id: string,
  archived: boolean
) {
  await meetings.updateSeries(id, { archived });
  revalidatePath("/library/meetings");
  revalidatePath(`/library/meetings/series/${id}`);
}

export async function deleteMeetingSeriesAction(id: string) {
  await meetings.removeSeries(id);
  revalidatePath("/library");
  revalidatePath("/library/meetings");
}

// ---------- Meetings ----------

export async function createMeetingAction(input: {
  series_id?: string | null;
  title?: string;
  meeting_date?: Date | string;
  body?: string;
}) {
  const seriesId = input.series_id ?? null;
  let title = input.title?.trim() ?? "";
  let body = input.body ?? "";
  if (seriesId && !title) {
    const series = await meetings.getSeries(seriesId);
    if (series) {
      // Default title to "<series title> — <date>"
      const date = new Date(input.meeting_date ?? Date.now());
      const datePart = date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      title = `${series.title} — ${datePart}`;
      if (!body && series.default_attendees) {
        body = `Attendees: ${series.default_attendees}\n\n`;
      }
    }
  }
  if (!title) title = "Untitled meeting";
  const meetingDate = input.meeting_date
    ? new Date(input.meeting_date)
    : new Date();
  const meeting = await meetings.createMeeting({
    series_id: seriesId,
    title,
    meeting_date: meetingDate,
    body,
  });
  for (const p of pathsForMeeting(seriesId, meeting._id)) revalidatePath(p);
  return meeting;
}

export async function updateMeetingAction(
  id: string,
  patch: {
    title?: string;
    meeting_date?: Date | string;
    body?: string;
    series_id?: string | null;
  }
) {
  const existing = await meetings.getMeeting(id);
  if (!existing) return;
  const next: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return;
    next.title = t;
  }
  if (patch.meeting_date !== undefined) {
    next.meeting_date = new Date(patch.meeting_date);
  }
  if (patch.body !== undefined) {
    next.body = patch.body;
  }
  if (patch.series_id !== undefined) {
    next.series_id = patch.series_id;
  }
  await meetings.updateMeeting(id, next);
  for (const p of pathsForMeeting(existing.series_id, id)) revalidatePath(p);
}

export async function deleteMeetingAction(id: string) {
  const existing = await meetings.getMeeting(id);
  if (!existing) return;
  await meetings.removeMeeting(id);
  for (const p of pathsForMeeting(existing.series_id, id)) revalidatePath(p);
}

// ---------- Action items (TODOs sourced from a meeting) ----------

export async function addActionItemAction(input: {
  meeting_id: string;
  title: string;
}) {
  const title = input.title.trim();
  if (!title) return;
  await todos.create({ title, source_meeting_id: input.meeting_id });
  const existing = await meetings.getMeeting(input.meeting_id);
  if (existing) {
    for (const p of pathsForMeeting(existing.series_id, input.meeting_id))
      revalidatePath(p);
  } else {
    revalidatePath("/todos");
  }
}
