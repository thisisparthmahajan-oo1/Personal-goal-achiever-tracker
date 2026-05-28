"use server";

import { revalidatePath } from "next/cache";
import * as tasks from "@/lib/repositories/tasks";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function normalizeWeekdays(input?: number[]): number[] {
  if (!input || input.length === 0) return ALL_DAYS;
  return [...new Set(input)].filter((d) => d >= 0 && d <= 6).sort();
}

export async function createHabitAction(input: {
  title: string;
  weekdays?: number[];
}) {
  const days = normalizeWeekdays(input.weekdays);
  await tasks.create({
    goal_id: null,
    parent_task_id: null,
    title: input.title.trim(),
    description: null,
    weight: 0,
    status: "todo",
    priority: "med",
    recurrence: {
      freq: "weekly",
      interval: 1,
      // Store null when every day is selected — semantically "every day"
      // and avoids creating a noisy array.
      weekdays: days.length === 7 ? null : days,
      end_date: null,
    },
    due_date: null,
  });
  revalidatePath("/habits");
  revalidatePath("/");
}

export async function setHabitWeekdaysAction(
  taskId: string,
  weekdays: number[]
) {
  const days = normalizeWeekdays(weekdays);
  await tasks.update(taskId, {
    recurrence: {
      freq: "weekly",
      interval: 1,
      weekdays: days.length === 7 ? null : days,
      end_date: null,
    },
  });
  revalidatePath("/habits");
  revalidatePath("/");
}

export async function deleteHabitAction(id: string) {
  await tasks.remove(id);
  revalidatePath("/habits");
  revalidatePath("/");
}
