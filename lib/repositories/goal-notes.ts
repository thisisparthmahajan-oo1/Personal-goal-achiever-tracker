import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getDb } from "@/lib/db";
import {
  GoalNoteSchema,
  type GoalNote,
  type GoalNoteInput,
  type GoalNoteKind,
  type GoalNotePatch,
} from "@/lib/schemas";

const COLLECTION = "goal_notes";

async function collection() {
  const db = await getDb();
  return db.collection<GoalNote>(COLLECTION);
}

export async function listForGoal(
  goalId: string,
  opts?: { kind?: GoalNoteKind }
): Promise<GoalNote[]> {
  const col = await collection();
  const filter: Filter<GoalNote> = { goal_id: goalId };
  if (opts?.kind) filter.kind = opts.kind;
  const docs = await col.find(filter).sort({ created_at: -1 }).toArray();
  return docs.map((d) => GoalNoteSchema.parse(d));
}

export async function listRecentForGoal(
  goalId: string,
  limit: number
): Promise<GoalNote[]> {
  const col = await collection();
  const docs = await col
    .find({ goal_id: goalId } as Filter<GoalNote>)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => GoalNoteSchema.parse(d));
}

export async function countForGoal(goalId: string): Promise<number> {
  const col = await collection();
  return col.countDocuments({ goal_id: goalId } as Filter<GoalNote>);
}

export async function get(id: string): Promise<GoalNote | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id } as Filter<GoalNote>);
  return doc ? GoalNoteSchema.parse(doc) : null;
}

export async function create(input: GoalNoteInput): Promise<GoalNote> {
  const col = await collection();
  const now = new Date();
  const note: GoalNote = {
    _id: randomUUID(),
    goal_id: input.goal_id,
    task_id: input.task_id ?? null,
    kind: input.kind ?? "personal",
    body: input.body,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(note);
  return note;
}

export async function update(
  id: string,
  patch: GoalNotePatch
): Promise<GoalNote | null> {
  const col = await collection();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<GoalNote>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? GoalNoteSchema.parse(result) : null;
}

export async function remove(id: string): Promise<boolean> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id } as Filter<GoalNote>);
  return result.deletedCount === 1;
}
