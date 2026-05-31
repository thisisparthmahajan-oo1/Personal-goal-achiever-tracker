import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getDb } from "@/lib/db";
import {
  TodoSchema,
  type Todo,
  type TodoInput,
} from "@/lib/schemas";

const COLLECTION = "todos";

async function collection() {
  const db = await getDb();
  return db.collection<Todo>(COLLECTION);
}

export async function list(): Promise<Todo[]> {
  const col = await collection();
  const docs = await col.find({}).sort({ created_at: 1 }).toArray();
  return docs.map((d) => TodoSchema.parse(d));
}

export async function listOpen(): Promise<Todo[]> {
  const col = await collection();
  const docs = await col
    .find({ completed_at: null } as Filter<Todo>)
    .sort({ created_at: 1 })
    .toArray();
  return docs.map((d) => TodoSchema.parse(d));
}

export async function listCompletedOn(date: Date): Promise<Todo[]> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const col = await collection();
  const docs = await col
    .find({ completed_at: { $gte: start, $lt: end } } as Filter<Todo>)
    .sort({ completed_at: -1 })
    .toArray();
  return docs.map((d) => TodoSchema.parse(d));
}

export async function get(id: string): Promise<Todo | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id } as Filter<Todo>);
  return doc ? TodoSchema.parse(doc) : null;
}

export async function create(input: TodoInput): Promise<Todo> {
  const col = await collection();
  const now = new Date();
  const todo: Todo = {
    _id: randomUUID(),
    title: input.title,
    notes: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(todo);
  return todo;
}

export async function setCompleted(
  id: string,
  completed: boolean
): Promise<Todo | null> {
  const col = await collection();
  const now = new Date();
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<Todo>,
    { $set: { completed_at: completed ? now : null, updated_at: now } },
    { returnDocument: "after" }
  );
  return result ? TodoSchema.parse(result) : null;
}

export async function updateTitle(
  id: string,
  title: string
): Promise<Todo | null> {
  const col = await collection();
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<Todo>,
    { $set: { title, updated_at: new Date() } },
    { returnDocument: "after" }
  );
  return result ? TodoSchema.parse(result) : null;
}

export async function updateNotes(
  id: string,
  notes: string | null
): Promise<Todo | null> {
  const col = await collection();
  const trimmed = notes && notes.trim().length > 0 ? notes : null;
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<Todo>,
    { $set: { notes: trimmed, updated_at: new Date() } },
    { returnDocument: "after" }
  );
  return result ? TodoSchema.parse(result) : null;
}

export async function remove(id: string): Promise<boolean> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id } as Filter<Todo>);
  return result.deletedCount === 1;
}
