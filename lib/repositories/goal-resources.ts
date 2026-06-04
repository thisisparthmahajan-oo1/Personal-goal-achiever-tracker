import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import {
  GoalResourceSchema,
  type GoalResource,
  type GoalResourceInput,
  type GoalResourcePatch,
} from "@/lib/schemas";

const COLLECTION = "goal_resources";

async function collection() {
  return getCollection<GoalResource>(COLLECTION);
}

export async function listForGoal(goalId: string): Promise<GoalResource[]> {
  const col = await collection();
  const docs = await col
    .find({ goal_id: goalId } as Filter<GoalResource>)
    .sort({ created_at: 1 })
    .toArray();
  return docs.map((d) => GoalResourceSchema.parse(d));
}

export async function get(id: string): Promise<GoalResource | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id } as Filter<GoalResource>);
  return doc ? GoalResourceSchema.parse(doc) : null;
}

export async function create(input: GoalResourceInput): Promise<GoalResource> {
  const col = await collection();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const resource: GoalResource = {
    _id: randomUUID(),
    profile_id: profileId,
    goal_id: input.goal_id,
    label: input.label,
    url: input.url,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(resource);
  return resource;
}

export async function update(
  id: string,
  patch: GoalResourcePatch
): Promise<GoalResource | null> {
  const col = await collection();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<GoalResource>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? GoalResourceSchema.parse(result) : null;
}

export async function remove(id: string): Promise<boolean> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id } as Filter<GoalResource>);
  return result.deletedCount === 1;
}
