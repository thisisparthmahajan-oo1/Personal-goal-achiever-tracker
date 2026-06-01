"use server";

import { revalidatePath } from "next/cache";
import * as exerciseWeights from "@/lib/repositories/exercise-weights";
import { WeightUnit, type WeightUnit as WeightUnitT } from "@/lib/schemas";

export async function setExerciseWeightAction(input: {
  exercise_key: string;
  weight: number | null;
  unit: WeightUnitT;
}) {
  await exerciseWeights.upsert({
    exercise_key: input.exercise_key,
    weight: input.weight,
    unit: WeightUnit.parse(input.unit),
  });
  revalidatePath("/library/gym");
  revalidatePath("/library/gym/[day]", "page");
}
