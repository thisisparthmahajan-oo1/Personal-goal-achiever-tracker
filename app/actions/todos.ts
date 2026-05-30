"use server";

import { revalidatePath } from "next/cache";
import * as todos from "@/lib/repositories/todos";

export async function createTodoAction(input: { title: string }) {
  const title = input.title.trim();
  if (!title) return;
  await todos.create({ title });
  revalidatePath("/todos");
}

export async function toggleTodoAction(id: string) {
  const existing = await todos.get(id);
  if (!existing) return;
  await todos.setCompleted(id, existing.completed_at === null);
  revalidatePath("/todos");
}

export async function renameTodoAction(id: string, title: string) {
  const next = title.trim();
  if (!next) return;
  await todos.updateTitle(id, next);
  revalidatePath("/todos");
}

export async function deleteTodoAction(id: string) {
  await todos.remove(id);
  revalidatePath("/todos");
}
