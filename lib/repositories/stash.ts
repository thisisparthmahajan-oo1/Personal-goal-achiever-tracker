import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import {
  StashItemSchema,
  type StashItem,
  type StashItemInput,
  type StashItemPatch,
} from "@/lib/schemas";

const COLLECTION = "stash_items";

async function collection() {
  return getCollection<StashItem>(COLLECTION);
}

export async function list(): Promise<StashItem[]> {
  const col = await collection();
  const docs = await col.find({}).sort({ created_at: -1 }).toArray();
  return docs.map((d) => StashItemSchema.parse(d));
}

export async function count(): Promise<number> {
  const col = await collection();
  return col.countDocuments({});
}

export async function get(id: string): Promise<StashItem | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id } as Filter<StashItem>);
  return doc ? StashItemSchema.parse(doc) : null;
}

export async function create(input: StashItemInput): Promise<StashItem> {
  const col = await collection();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const item: StashItem = {
    _id: randomUUID(),
    profile_id: profileId,
    label: input.label,
    url: input.url,
    note: input.note ?? null,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(item);
  return item;
}

export async function update(
  id: string,
  patch: StashItemPatch
): Promise<StashItem | null> {
  const col = await collection();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<StashItem>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? StashItemSchema.parse(result) : null;
}

export async function remove(id: string): Promise<boolean> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id } as Filter<StashItem>);
  return result.deletedCount === 1;
}
