import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BookEntrySchema,
  type BookEntry,
  type BookEntryInput,
  type BookEntryPatch,
} from "@/lib/schemas";

const COLLECTION = "book_entries";

async function collection() {
  const db = await getDb();
  return db.collection<BookEntry>(COLLECTION);
}

export async function list(): Promise<BookEntry[]> {
  const col = await collection();
  const docs = await col.find({}).sort({ created_at: 1 }).toArray();
  return docs.map((d) => BookEntrySchema.parse(d));
}

export async function get(id: string): Promise<BookEntry | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id } as Filter<BookEntry>);
  return doc ? BookEntrySchema.parse(doc) : null;
}

export async function create(input: BookEntryInput): Promise<BookEntry> {
  const col = await collection();
  const now = new Date();
  const entry: BookEntry = {
    _id: randomUUID(),
    title: input.title,
    type: input.type,
    domains: input.domains ?? [],
    status: input.status ?? "pipelined",
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(entry);
  return entry;
}

export async function update(
  id: string,
  patch: BookEntryPatch
): Promise<BookEntry | null> {
  const col = await collection();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<BookEntry>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? BookEntrySchema.parse(result) : null;
}

export async function remove(id: string): Promise<boolean> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id } as Filter<BookEntry>);
  return result.deletedCount === 1;
}
