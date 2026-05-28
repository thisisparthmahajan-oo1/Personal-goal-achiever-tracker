"use server";

import { revalidatePath } from "next/cache";
import * as tasks from "@/lib/repositories/tasks";
import {
  RecurrenceRuleSchema,
  TaskStatus,
  type RecurrenceRule,
  type TaskStatus as TaskStatusT,
} from "@/lib/schemas";

export async function createTaskAction(input: {
  goal_id: string;
  title: string;
  weight: number;
  parent_task_id?: string | null;
  priority?: "low" | "med" | "high";
}) {
  const created = await tasks.create({
    goal_id: input.goal_id,
    title: input.title,
    parent_task_id: input.parent_task_id ?? null,
    description: null,
    weight: input.weight,
    status: "todo",
    priority: input.priority ?? "med",
    recurrence: null,
    due_date: null,
  });
  revalidatePath(`/goals/${input.goal_id}`);
  revalidatePath("/");
  return created;
}

export async function setTaskStatusAction(
  id: string,
  status: TaskStatusT,
  goalId: string
) {
  TaskStatus.parse(status);
  await tasks.update(id, { status });
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
}

export async function setTaskWeightAction(
  id: string,
  goalId: string,
  weight: number
) {
  await tasks.update(id, { weight });
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
}

export async function updateTaskAction(
  id: string,
  goalId: string,
  patch: {
    title?: string;
    priority?: "low" | "med" | "high";
    description?: string | null;
    weight?: number;
  }
) {
  await tasks.update(id, patch);
  revalidatePath(`/goals/${goalId}`);
}

export async function deleteTaskAction(id: string, goalId: string) {
  await tasks.remove(id);
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
}

export async function setRecurrenceAction(
  id: string,
  goalId: string,
  rule: RecurrenceRule | null
) {
  const parsed = rule ? RecurrenceRuleSchema.parse(rule) : null;
  // If turning on recurrence, force weight to 0 (the repo will validate).
  if (parsed) {
    await tasks.update(id, { recurrence: parsed, weight: 0 });
  } else {
    await tasks.update(id, { recurrence: null });
  }
  revalidatePath(`/goals/${goalId}`);
}

export async function toggleOccurrenceAction(
  taskId: string,
  goalId: string,
  occurrenceDate: string
) {
  const date = new Date(occurrenceDate);
  await tasks.toggleOccurrence(taskId, date);
  if (goalId) {
    revalidatePath(`/goals/${goalId}`);
  } else {
    revalidatePath("/habits");
  }
  revalidatePath("/");
}
