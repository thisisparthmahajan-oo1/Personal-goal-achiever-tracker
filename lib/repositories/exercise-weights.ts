import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import {
  ExerciseWeightSchema,
  type ExerciseWeight,
  type WeightUnit,
} from "@/lib/schemas";

const COLLECTION = "exercise_weights";

async function collection() {
  return getCollection<ExerciseWeight>(COLLECTION);
}

export async function list(): Promise<ExerciseWeight[]> {
  const col = await collection();
  const docs = await col.find({}).toArray();
  return docs.map((d) => ExerciseWeightSchema.parse(d));
}

export async function getMap(): Promise<Record<string, ExerciseWeight>> {
  const all = await list();
  const out: Record<string, ExerciseWeight> = {};
  for (const w of all) out[w.exercise_key] = w;
  return out;
}

/**
 * Upsert by `exercise_key`. Passing weight=null clears the value but keeps
 * the row (so unit choice sticks).
 */
export async function upsert(input: {
  exercise_key: string;
  weight: number | null;
  unit: WeightUnit;
}): Promise<ExerciseWeight> {
  const col = await collection();
  const now = new Date();
  const existing = await col.findOne({
    exercise_key: input.exercise_key,
  } as Filter<ExerciseWeight>);
  if (existing) {
    const result = await col.findOneAndUpdate(
      { _id: existing._id } as Filter<ExerciseWeight>,
      {
        $set: { weight: input.weight, unit: input.unit, updated_at: now },
      },
      { returnDocument: "after" }
    );
    return ExerciseWeightSchema.parse(result);
  }
  const profileId = await getActiveProfileId();
  const entry: ExerciseWeight = {
    _id: randomUUID(),
    profile_id: profileId,
    exercise_key: input.exercise_key,
    weight: input.weight,
    unit: input.unit,
    updated_at: now,
  };
  await col.insertOne(entry);
  return entry;
}
