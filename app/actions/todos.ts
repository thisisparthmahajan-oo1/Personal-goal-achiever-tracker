"use server";

import { revalidatePath } from "next/cache";
import * as todos from "@/lib/repositories/todos";
import type { TaskStatus } from "@/lib/schemas";
import { requireSession } from "@/lib/require-session";

export async function createTodoAction(input: { title: string }) {
  await requireSession();
  const title = input.title.trim();
  if (!title) return;
  await todos.create({ title });
  revalidatePath("/todos");
}

const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done"];

export async function cycleTodoStatusAction(id: string) {
  await requireSession();
  const existing = await todos.get(id);
  if (!existing) return;
  const next =
    STATUS_ORDER[(STATUS_ORDER.indexOf(existing.status) + 1) % STATUS_ORDER.length];
  await todos.setStatus(id, next);
  revalidatePath("/todos");
}

export async function setTodoStatusAction(id: string, status: TaskStatus) {
  await requireSession();
  await todos.setStatus(id, status);
  revalidatePath("/todos");
}

export async function renameTodoAction(id: string, title: string) {
  await requireSession();
  const next = title.trim();
  if (!next) return;
  await todos.updateTitle(id, next);
  revalidatePath("/todos");
}

export async function setTodoNotesAction(id: string, notes: string) {
  await requireSession();
  await todos.updateNotes(id, notes);
  revalidatePath("/todos");
}

export async function deleteTodoAction(id: string) {
  await requireSession();
  await todos.remove(id);
  revalidatePath("/todos");
}

export async function reorderTodosAction(ids: string[]) {
  await requireSession();
  if (!Array.isArray(ids) || ids.length === 0) return;
  await todos.setOrder(ids);
  revalidatePath("/todos");
}
