import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import {
  TripSectionSchema,
  TripSectionItemSchema,
  TripSpotSchema,
  type TripSection,
  type TripSectionContentType,
  type TripSectionPatch,
  type TripSectionItem,
  type TripSectionItemPatch,
  type TripSpot,
  type TripSpotPatch,
} from "@/lib/schemas";

const SECTIONS_COLLECTION = "trip_sections";
const ITEMS_COLLECTION = "trip_section_items";
const SPOTS_COLLECTION = "trip_spots";

async function sectionsCol() {
  return getCollection<TripSection>(SECTIONS_COLLECTION);
}

async function itemsCol() {
  return getCollection<TripSectionItem>(ITEMS_COLLECTION);
}

async function spotsCol() {
  return getCollection<TripSpot>(SPOTS_COLLECTION);
}

// ---------- Sections ----------

export async function listSections(tripId: string): Promise<TripSection[]> {
  const col = await sectionsCol();
  const docs = await col
    .find({ trip_id: tripId } as Filter<TripSection>)
    .sort({ sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map((d) => TripSectionSchema.parse(d));
}

export async function getSection(id: string): Promise<TripSection | null> {
  const col = await sectionsCol();
  const doc = await col.findOne({ _id: id } as Filter<TripSection>);
  return doc ? TripSectionSchema.parse(doc) : null;
}

export async function createSection(
  tripId: string,
  input: {
    name: string;
    parent_id?: string | null;
    content_type?: TripSectionContentType;
  }
): Promise<TripSection> {
  const parentId = input.parent_id ?? null;
  if (parentId) {
    const parent = await getSection(parentId);
    if (!parent || parent.trip_id !== tripId) {
      throw new Error(`Parent section not found: ${parentId}`);
    }
    if (parent.parent_id) {
      throw new Error("Sections can only nest one level deep");
    }
  }
  const col = await sectionsCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const section: TripSection = {
    _id: randomUUID(),
    profile_id: profileId,
    trip_id: tripId,
    parent_id: parentId,
    name: input.name,
    content_type: input.content_type ?? "tasks",
    sort_order: now.getTime(),
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(section);
  return section;
}

export async function setSectionOrder(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const col = await sectionsCol();
  const now = new Date();
  await Promise.all(
    ids.map((id, idx) =>
      col.updateOne(
        { _id: id } as Filter<TripSection>,
        { $set: { sort_order: idx, updated_at: now } }
      )
    )
  );
}

export async function updateSection(
  id: string,
  patch: TripSectionPatch
): Promise<TripSection | null> {
  const col = await sectionsCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<TripSection>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? TripSectionSchema.parse(result) : null;
}

export async function removeSection(id: string): Promise<boolean> {
  const sCol = await sectionsCol();
  const iCol = await itemsCol();
  const spCol = await spotsCol();

  const children = await sCol
    .find({ parent_id: id } as Filter<TripSection>)
    .toArray();
  for (const child of children) {
    await iCol.deleteMany({ section_id: child._id } as Filter<TripSectionItem>);
    await spCol.deleteMany({ section_id: child._id } as Filter<TripSpot>);
    await sCol.deleteOne({ _id: child._id } as Filter<TripSection>);
  }

  await iCol.deleteMany({ section_id: id } as Filter<TripSectionItem>);
  await spCol.deleteMany({ section_id: id } as Filter<TripSpot>);
  const result = await sCol.deleteOne({ _id: id } as Filter<TripSection>);
  return result.deletedCount === 1;
}

// ---------- Items ----------

export async function listItems(tripId: string): Promise<TripSectionItem[]> {
  const col = await itemsCol();
  const docs = await col
    .find({ trip_id: tripId } as Filter<TripSectionItem>)
    .sort({ sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map((d) => TripSectionItemSchema.parse(d));
}

export async function getItem(id: string): Promise<TripSectionItem | null> {
  const col = await itemsCol();
  const doc = await col.findOne({ _id: id } as Filter<TripSectionItem>);
  return doc ? TripSectionItemSchema.parse(doc) : null;
}

export async function createItem(
  tripId: string,
  sectionId: string,
  input: { name: string }
): Promise<TripSectionItem> {
  const col = await itemsCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const item: TripSectionItem = {
    _id: randomUUID(),
    profile_id: profileId,
    trip_id: tripId,
    section_id: sectionId,
    name: input.name,
    status: "yet_to_start",
    due_date: null,
    notes: null,
    sort_order: now.getTime(),
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(item);
  return item;
}

export async function updateItem(
  id: string,
  patch: TripSectionItemPatch
): Promise<TripSectionItem | null> {
  const col = await itemsCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<TripSectionItem>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? TripSectionItemSchema.parse(result) : null;
}

export async function removeItem(id: string): Promise<boolean> {
  const col = await itemsCol();
  const result = await col.deleteOne({ _id: id } as Filter<TripSectionItem>);
  return result.deletedCount === 1;
}

// ---------- Spots ----------

export async function listSpots(tripId: string): Promise<TripSpot[]> {
  const col = await spotsCol();
  const docs = await col
    .find({ trip_id: tripId } as Filter<TripSpot>)
    .sort({ sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map((d) => TripSpotSchema.parse(d));
}

export async function getSpot(id: string): Promise<TripSpot | null> {
  const col = await spotsCol();
  const doc = await col.findOne({ _id: id } as Filter<TripSpot>);
  return doc ? TripSpotSchema.parse(doc) : null;
}

export async function createSpot(
  tripId: string,
  sectionId: string,
  input: { name: string }
): Promise<TripSpot> {
  const col = await spotsCol();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const spot: TripSpot = {
    _id: randomUUID(),
    profile_id: profileId,
    trip_id: tripId,
    section_id: sectionId,
    name: input.name,
    category: "other",
    priority: "optional",
    meal_tags: [],
    dishes: null,
    link: null,
    notes: null,
    sort_order: now.getTime(),
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(spot);
  return spot;
}

export async function updateSpot(
  id: string,
  patch: TripSpotPatch
): Promise<TripSpot | null> {
  const col = await spotsCol();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<TripSpot>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? TripSpotSchema.parse(result) : null;
}

export async function removeSpot(id: string): Promise<boolean> {
  const col = await spotsCol();
  const result = await col.deleteOne({ _id: id } as Filter<TripSpot>);
  return result.deletedCount === 1;
}
