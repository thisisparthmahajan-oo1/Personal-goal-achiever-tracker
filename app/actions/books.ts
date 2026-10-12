"use server";

import { revalidatePath } from "next/cache";
import * as books from "@/lib/repositories/books";
import {
  BookType,
  BookStatus,
  type BookType as BookTypeT,
  type BookStatus as BookStatusT,
} from "@/lib/schemas";
import { requireSession } from "@/lib/require-session";

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createBookAction(input: {
  title: string;
  type: BookTypeT;
  domains?: string[];
  status?: BookStatusT;
  start_date?: string | null;
  end_date?: string | null;
}) {
  await requireSession();
  const status = input.status ?? "pipelined";
  await books.create({
    title: input.title.trim(),
    type: BookType.parse(input.type),
    domains: (input.domains ?? []).filter((d) => d.trim().length > 0),
    status: BookStatus.parse(status),
    start_date: parseDate(input.start_date),
    end_date: parseDate(input.end_date),
    body: "",
  });
  revalidatePath("/library/books");
  revalidatePath("/library");
}

export async function setBookStatusAction(id: string, status: BookStatusT) {
  await requireSession();
  const existing = await books.get(id);
  if (!existing) return;
  const now = new Date();
  const patch: Record<string, unknown> = { status };
  // Auto-stamp dates on status transitions when fields are still empty —
  // user can override manually via setBookFieldAction.
  if (status === "in-progress" && !existing.start_date) {
    patch.start_date = now;
  }
  if (status === "completed") {
    if (!existing.start_date) patch.start_date = now;
    if (!existing.end_date) patch.end_date = now;
  }
  await books.update(id, patch);
  revalidatePath("/library/books");
}

export async function setBookFieldAction(
  id: string,
  patch: {
    title?: string;
    type?: BookTypeT;
    domains?: string[];
    start_date?: string | null;
    end_date?: string | null;
    body?: string;
  }
) {
  await requireSession();
  const next: Record<string, unknown> = {};
  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.type !== undefined) next.type = BookType.parse(patch.type);
  if (patch.domains !== undefined)
    next.domains = patch.domains.filter((d) => d.trim().length > 0);
  if (patch.start_date !== undefined) next.start_date = parseDate(patch.start_date);
  if (patch.end_date !== undefined) next.end_date = parseDate(patch.end_date);
  if (patch.body !== undefined) next.body = patch.body;
  await books.update(id, next);
  revalidatePath("/library/books");
  revalidatePath(`/library/books/${id}`);
}

export async function deleteBookAction(id: string) {
  await requireSession();
  await books.remove(id);
  revalidatePath("/library/books");
  revalidatePath("/library");
}

// ---------- Notes sections ----------

function pathsForBook(id: string) {
  return ["/library/books", `/library/books/${id}`];
}

export async function addBookSectionAction(input: {
  book_id: string;
  title: string;
}) {
  await requireSession();
  await books.addSection(input.book_id, input.title);
  for (const p of pathsForBook(input.book_id)) revalidatePath(p);
}

export async function updateBookSectionAction(
  bookId: string,
  sectionId: string,
  patch: { title?: string; body?: string }
) {
  await requireSession();
  const next: { title?: string; body?: string } = {};
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.body !== undefined) next.body = patch.body;
  await books.updateSection(bookId, sectionId, next);
  for (const p of pathsForBook(bookId)) revalidatePath(p);
}

export async function removeBookSectionAction(bookId: string, sectionId: string) {
  await requireSession();
  await books.removeSection(bookId, sectionId);
  for (const p of pathsForBook(bookId)) revalidatePath(p);
}
