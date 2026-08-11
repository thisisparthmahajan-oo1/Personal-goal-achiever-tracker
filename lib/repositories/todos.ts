import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import {
  TodoSchema,
  type Todo,
  type TodoInput,
  type TaskStatus,
} from "@/lib/schemas";

const COLLECTION = "todos";

async function collection() {
  return getCollection<Todo>(COLLECTION);
}

// Legacy todos may have been written before `status` existed. If they were
// marked complete via completed_at but parse defaulted status to "todo",
// normalize that to "done" for display.
function normalize(t: Todo): Todo {
  if (t.completed_at && t.status === "todo") return { ...t, status: "done" };
  return t;
}

export async function list(): Promise<Todo[]> {
  const col = await collection();
  const docs = await col.find({}).sort({ created_at: 1 }).toArray();
  return docs.map((d) => normalize(TodoSchema.parse(d)));
}

export async function listOpen(): Promise<Todo[]> {
  const col = await collection();
  const docs = await col
    .find({ completed_at: null } as Filter<Todo>)
    .sort({ sort_order: 1, created_at: 1 })
    .toArray();
  return docs.map((d) => normalize(TodoSchema.parse(d)));
}

export async function listCompletedBetween(
  from: Date,
  to: Date
): Promise<Todo[]> {
  const col = await collection();
  const docs = await col
    .find({ completed_at: { $gte: from, $lt: to } } as Filter<Todo>)
    .sort({ completed_at: -1 })
    .toArray();
  return docs.map((d) => normalize(TodoSchema.parse(d)));
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
  return docs.map((d) => normalize(TodoSchema.parse(d)));
}

export async function get(id: string): Promise<Todo | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id } as Filter<Todo>);
  return doc ? normalize(TodoSchema.parse(doc)) : null;
}

export async function create(
  input: TodoInput & {
    source_meeting_id?: string | null;
    source_goal_id?: string | null;
  }
): Promise<Todo> {
  const col = await collection();
  const now = new Date();
  const profileId = await getActiveProfileId();
  const todo: Todo = {
    _id: randomUUID(),
    profile_id: profileId,
    title: input.title,
    notes: null,
    source_meeting_id: input.source_meeting_id ?? null,
    source_goal_id: input.source_goal_id ?? null,
    sort_order: now.getTime(),
    status: "todo",
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(todo);
  return todo;
}

export async function listForMeeting(meetingId: string): Promise<Todo[]> {
  const col = await collection();
  const docs = await col
    .find({ source_meeting_id: meetingId } as Filter<Todo>)
    .sort({ created_at: 1 })
    .toArray();
  return docs.map((d) => normalize(TodoSchema.parse(d)));
}

export async function listForGoal(goalId: string): Promise<Todo[]> {
  const col = await collection();
  const docs = await col
    .find({ source_goal_id: goalId } as Filter<Todo>)
    .sort({ created_at: 1 })
    .toArray();
  return docs.map((d) => normalize(TodoSchema.parse(d)));
}

export async function setCompleted(
  id: string,
  completed: boolean
): Promise<Todo | null> {
  const col = await collection();
  const now = new Date();
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<Todo>,
    {
      $set: {
        completed_at: completed ? now : null,
        status: completed ? "done" : "todo",
        updated_at: now,
      },
    },
    { returnDocument: "after" }
  );
  return result ? normalize(TodoSchema.parse(result)) : null;
}

export async function setStatus(
  id: string,
  status: TaskStatus
): Promise<Todo | null> {
  const col = await collection();
  const now = new Date();
  const $set: Record<string, unknown> = { status, updated_at: now };
  if (status === "done") $set.completed_at = now;
  else $set.completed_at = null;
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<Todo>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? normalize(TodoSchema.parse(result)) : null;
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
  return result ? normalize(TodoSchema.parse(result)) : null;
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
  return result ? normalize(TodoSchema.parse(result)) : null;
}

export async function setOrder(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const col = await collection();
  const now = new Date();
  await Promise.all(
    ids.map((id, idx) =>
      col.updateOne(
        { _id: id } as Filter<Todo>,
        { $set: { sort_order: idx, updated_at: now } }
      )
    )
  );
}

export async function remove(id: string): Promise<boolean> {
  const col = await collection();
  const result = await col.deleteOne({ _id: id } as Filter<Todo>);
  return result.deletedCount === 1;
}
