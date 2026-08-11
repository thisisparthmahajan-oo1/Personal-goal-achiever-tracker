"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as goals from "@/lib/repositories/goals";
import * as todos from "@/lib/repositories/todos";
import { GoalInputSchema, GoalPatchSchema } from "@/lib/schemas";

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function parseDate(v: FormDataEntryValue | null): Date | null {
  const s = emptyToNull(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createGoalAction(formData: FormData) {
  const parsed = GoalInputSchema.parse({
    title: formData.get("title"),
    description: emptyToNull(formData.get("description")),
    target_date: parseDate(formData.get("target_date")),
    source: emptyToNull(formData.get("source")),
    status: "active",
  });
  const goal = await goals.create(parsed);
  revalidatePath("/");
  redirect(`/goals/${goal._id}`);
}

export async function updateGoalAction(id: string, formData: FormData) {
  const parsed = GoalPatchSchema.parse({
    title: formData.get("title"),
    description: emptyToNull(formData.get("description")),
    target_date: parseDate(formData.get("target_date")),
    source: emptyToNull(formData.get("source")),
    status: emptyToNull(formData.get("status")) ?? undefined,
  });
  await goals.update(id, parsed);
  revalidatePath("/");
  revalidatePath(`/goals/${id}`);
  redirect(`/goals/${id}`);
}

export async function deleteGoalAction(id: string) {
  await goals.remove(id);
  revalidatePath("/");
  redirect("/");
}

export async function updateGoalStatusAction(id: string, status: "active" | "completed" | "archived") {
  await goals.update(id, { status });
  revalidatePath("/");
  revalidatePath(`/goals/${id}`);
}

// ---------- Todos (sourced from a goal) ----------

export async function addGoalTodoAction(input: { goal_id: string; title: string }) {
  const title = input.title.trim();
  if (!title) return;
  await todos.create({ title, source_goal_id: input.goal_id });
  revalidatePath(`/goals/${input.goal_id}`);
}
