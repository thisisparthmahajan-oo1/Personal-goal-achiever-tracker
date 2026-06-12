import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import {
  MeetingSeriesSchema,
  MeetingSchema,
  type MeetingSeries,
  type MeetingSeriesInput,
  type MeetingSeriesPatch,
  type Meeting,
  type MeetingInput,
  type MeetingPatch,
} from "@/lib/schemas";

const SERIES_COLLECTION = "meeting_series";
const MEETINGS_COLLECTION = "meetings";

async function seriesCol() {
  return getCollection<MeetingSeries>(SERIES_COLLECTION);
}

async function meetingsCol() {
  return getCollection<Meeting>(MEETINGS_COLLECTION);
}

// ---------- Series ----------

export async function listSeries(opts?: {
  archived?: boolean;
}): Promise<MeetingSeries[]> {
  const col = await seriesCol();
  const filter: Filter<MeetingSeries> = {};
  if (opts?.archived !== undefined) filter.archived = opts.archived;
  const docs = await col.find(filter).sort({ updated_at: -1 }).toArray();
  return docs.map((d) => MeetingSeriesSchema.parse(d));
}

export async function getSeries(id: string): Promise<MeetingSeries | null> {
  const col = await seriesCol();
  const doc = await col.findOne({ _id: id } as Filter<MeetingSeries>);
  return doc ? MeetingSeriesSchema.parse(doc) : null;
}

export async function createSeries(
  input: MeetingSeriesInput
): Promise<MeetingSeries> {
  const col = await seriesCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const series: MeetingSeries = {
    _id: randomUUID(),
    profile_id: profileId,
    title: input.title,
    cadence_label: input.cadence_label ?? null,
    default_attendees: input.default_attendees ?? null,
    archived: false,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(series);
  return series;
}

export async function updateSeries(
  id: string,
  patch: MeetingSeriesPatch
): Promise<MeetingSeries | null> {
  const col = await seriesCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<MeetingSeries>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? MeetingSeriesSchema.parse(result) : null;
}

/**
 * Removes a series and detaches its meetings (sets their series_id to null
 * so they live on as ad-hoc records). Past notes survive.
 */
export async function removeSeries(id: string): Promise<boolean> {
  const sCol = await seriesCol();
  const mCol = await meetingsCol();
  await mCol.updateMany(
    { series_id: id } as Filter<Meeting>,
    { $set: { series_id: null, updated_at: new Date() } }
  );
  const result = await sCol.deleteOne({ _id: id } as Filter<MeetingSeries>);
  return result.deletedCount === 1;
}

// ---------- Meetings ----------

export async function listMeetings(opts?: {
  series_id?: string | null;
  limit?: number;
}): Promise<Meeting[]> {
  const col = await meetingsCol();
  const filter: Filter<Meeting> = {};
  if (opts && "series_id" in opts) {
    filter.series_id = opts.series_id ?? null;
  }
  let cursor = col.find(filter).sort({ meeting_date: -1 });
  if (opts?.limit) cursor = cursor.limit(opts.limit);
  const docs = await cursor.toArray();
  return docs.map((d) => MeetingSchema.parse(d));
}

export async function listRecentMeetings(limit: number): Promise<Meeting[]> {
  const col = await meetingsCol();
  const docs = await col
    .find({})
    .sort({ meeting_date: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => MeetingSchema.parse(d));
}

export async function countMeetingsInSeries(seriesId: string): Promise<number> {
  const col = await meetingsCol();
  return col.countDocuments({ series_id: seriesId } as Filter<Meeting>);
}

export async function countAdhocMeetings(): Promise<number> {
  const col = await meetingsCol();
  return col.countDocuments({ series_id: null } as Filter<Meeting>);
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  const col = await meetingsCol();
  const doc = await col.findOne({ _id: id } as Filter<Meeting>);
  return doc ? MeetingSchema.parse(doc) : null;
}

export async function createMeeting(input: MeetingInput): Promise<Meeting> {
  const col = await meetingsCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const meeting: Meeting = {
    _id: randomUUID(),
    profile_id: profileId,
    series_id: input.series_id ?? null,
    title: input.title,
    meeting_date: input.meeting_date ?? now,
    body: input.body ?? "",
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(meeting);
  // Bump the parent series' updated_at so it floats to the top.
  if (meeting.series_id) {
    const sCol = await seriesCol();
    await sCol.updateOne(
      { _id: meeting.series_id } as Filter<MeetingSeries>,
      { $set: { updated_at: now } }
    );
  }
  return meeting;
}

export async function updateMeeting(
  id: string,
  patch: MeetingPatch
): Promise<Meeting | null> {
  const col = await meetingsCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<Meeting>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? MeetingSchema.parse(result) : null;
}

/**
 * Deletes a meeting and unlinks (does not delete) any TODOs that reference it
 * via source_meeting_id. The user's open TODOs survive the meeting record.
 */
export async function removeMeeting(id: string): Promise<boolean> {
  const mCol = await meetingsCol();
  const todosCol = await getCollection<{
    _id: string;
    source_meeting_id: string | null;
  }>("todos");
  await todosCol.updateMany(
    { source_meeting_id: id },
    { $set: { source_meeting_id: null, updated_at: new Date() } }
  );
  const result = await mCol.deleteOne({ _id: id } as Filter<Meeting>);
  return result.deletedCount === 1;
}
