"use server";

import { revalidatePath } from "next/cache";
import * as goalNotes from "@/lib/repositories/goal-notes";
import { GoalNoteKind, type GoalNoteKind as GoalNoteKindT } from "@/lib/schemas";

export async function createGoalNoteAction(input: {
  goal_id: string;
  task_id?: string | null;
  kind: GoalNoteKindT;
  body: string;
}) {
  const body = input.body.trim();
  if (!body) return;
  await goalNotes.create({
    goal_id: input.goal_id,
    task_id: input.task_id ?? null,
    kind: GoalNoteKind.parse(input.kind),
    body,
  });
  revalidatePath(`/goals/${input.goal_id}`);
  revalidatePath(`/goals/${input.goal_id}/notes`);
}

export async function updateGoalNoteAction(
  id: string,
  patch: {
    kind?: GoalNoteKindT;
    body?: string;
    task_id?: string | null;
  }
) {
  const existing = await goalNotes.get(id);
  if (!existing) return;
  const next: Record<string, unknown> = {};
  if (patch.kind !== undefined) next.kind = GoalNoteKind.parse(patch.kind);
  if (patch.body !== undefined) {
    const trimmed = patch.body.trim();
    if (!trimmed) return;
    next.body = trimmed;
  }
  if (patch.task_id !== undefined) next.task_id = patch.task_id;
  await goalNotes.update(id, next);
  revalidatePath(`/goals/${existing.goal_id}`);
  revalidatePath(`/goals/${existing.goal_id}/notes`);
}

export async function deleteGoalNoteAction(id: string) {
  const existing = await goalNotes.get(id);
  if (!existing) return;
  await goalNotes.remove(id);
  revalidatePath(`/goals/${existing.goal_id}`);
  revalidatePath(`/goals/${existing.goal_id}/notes`);
}
