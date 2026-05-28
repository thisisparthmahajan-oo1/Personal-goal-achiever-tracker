import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getDb } from "@/lib/db";
import {
  TaskSchema,
  TaskInstanceSchema,
  type Task,
  type TaskInput,
  type TaskPatch,
  type TaskInstance,
  type TaskStatus,
} from "@/lib/schemas";
import { expandRecurrence } from "@/lib/recurrence";

const COLLECTION = "tasks";
const INSTANCES = "task_instances";

async function collection() {
  const db = await getDb();
  return db.collection<Task>(COLLECTION);
}

async function instancesCollection() {
  const db = await getDb();
  return db.collection<TaskInstance>(INSTANCES);
}

// ---------- Validation helpers ----------

export class TaskValidationError extends Error {}

/**
 * Walk up the parent chain to determine the depth at which a new child would
 * be inserted. Depth 0 = root, 1 = subtask, 2 = grandchild. Anything ≥ 3 is
 * rejected.
 */
async function validateDepthForInsert(parentTaskId: string | null) {
  if (!parentTaskId) return;
  const parent = await get(parentTaskId);
  if (!parent) throw new TaskValidationError("Parent task not found");
  if (parent.recurrence) {
    throw new TaskValidationError("Recurring tasks cannot have subtasks");
  }
  if (!parent.parent_task_id) return; // child of root → depth 1, OK
  const grandparent = await get(parent.parent_task_id);
  if (!grandparent) throw new TaskValidationError("Grandparent task not found");
  if (grandparent.parent_task_id) {
    throw new TaskValidationError("Maximum nesting depth (3 levels) exceeded");
  }
  // depth 2 → grandchild, OK
}

/**
 * Validate that adding/updating a task's weight won't push the sibling sum
 * past its allowed maximum (100 at root, parent.weight for subtasks).
 */
async function validateWeightBudget(args: {
  goal_id: string;
  parent_task_id: string | null;
  weight: number;
  excludeTaskId?: string;
}) {
  const { goal_id, parent_task_id, weight, excludeTaskId } = args;
  if (!Number.isInteger(weight) || weight < 0 || weight > 100) {
    throw new TaskValidationError("Weight must be an integer between 0 and 100");
  }
  const siblings = await list({ goal_id, parent_task_id });
  const sumOthers = siblings
    .filter((s) => s._id !== excludeTaskId)
    .reduce((sum, s) => sum + (s.weight ?? 0), 0);

  let max = 100;
  if (parent_task_id) {
    const parent = await get(parent_task_id);
    if (!parent) throw new TaskValidationError("Parent task not found");
    max = parent.weight ?? 0;
  }
  if (sumOthers + weight > max) {
    const remaining = max - sumOthers;
    throw new TaskValidationError(
      `Weight ${weight} exceeds remaining budget of ${remaining} (max ${max}, others sum to ${sumOthers})`
    );
  }
}

async function hasChildren(taskId: string): Promise<boolean> {
  const col = await collection();
  return (await col.countDocuments({ parent_task_id: taskId })) > 0;
}

async function validateRecurringConstraints(args: {
  taskId?: string;
  recurrence: Task["recurrence"];
  weight: number;
}) {
  if (!args.recurrence) return;
  if (args.weight !== 0) {
    throw new TaskValidationError("Recurring tasks must have weight 0");
  }
  if (args.taskId && (await hasChildren(args.taskId))) {
    throw new TaskValidationError("Recurring tasks cannot have subtasks");
  }
}

// ---------- Reads ----------

export async function list(filter?: {
  goal_id?: string;
  status?: TaskStatus;
  parent_task_id?: string | null;
}): Promise<Task[]> {
  const col = await collection();
  const q: Record<string, unknown> = {};
  if (filter?.goal_id) q.goal_id = filter.goal_id;
  if (filter?.status) q.status = filter.status;
  if (filter?.parent_task_id !== undefined) q.parent_task_id = filter.parent_task_id;
  const docs = await col.find(q).sort({ created_at: 1 }).toArray();
  return docs.map((d) => TaskSchema.parse(d));
}

export async function get(id: string): Promise<Task | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id } as Filter<Task>);
  return doc ? TaskSchema.parse(doc) : null;
}

// ---------- Writes ----------

export async function create(input: TaskInput): Promise<Task> {
  const weight = input.weight ?? 0;
  const recurrence = input.recurrence ?? null;

  await validateDepthForInsert(input.parent_task_id ?? null);
  await validateRecurringConstraints({ recurrence, weight });
  // Recurring task: skip weight budget (it's 0, but the parent might be).
  if (!recurrence) {
    await validateWeightBudget({
      goal_id: input.goal_id,
      parent_task_id: input.parent_task_id ?? null,
      weight,
    });
  }

  const col = await collection();
  const now = new Date();
  const task: Task = {
    _id: randomUUID(),
    goal_id: input.goal_id,
    parent_task_id: input.parent_task_id ?? null,
    title: input.title,
    description: input.description ?? null,
    weight,
    status: input.status ?? "todo",
    priority: input.priority ?? "med",
    recurrence,
    due_date: input.due_date ?? null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(task);

  // If a non-leaf parent exists, its weight envelope might still be balanced;
  // no propagation needed at creation time since the new task starts as todo.
  return task;
}

export async function update(id: string, patch: TaskPatch): Promise<Task | null> {
  const existing = await get(id);
  if (!existing) return null;

  // Determine effective post-update fields for validation.
  const nextWeight = patch.weight ?? existing.weight;
  const nextRecurrence =
    patch.recurrence !== undefined ? patch.recurrence ?? null : existing.recurrence;
  const nextParent =
    patch.parent_task_id !== undefined
      ? patch.parent_task_id ?? null
      : existing.parent_task_id;

  if (patch.recurrence !== undefined || patch.weight !== undefined) {
    await validateRecurringConstraints({
      taskId: id,
      recurrence: nextRecurrence,
      weight: nextWeight,
    });
  }

  // Weight budget check, but only when the task contributes to budget (not recurring).
  if (patch.weight !== undefined && !nextRecurrence) {
    await validateWeightBudget({
      goal_id: existing.goal_id,
      parent_task_id: nextParent,
      weight: nextWeight,
      excludeTaskId: id,
    });
  }

  const willChangeStatus =
    patch.status !== undefined && patch.status !== existing.status;
  const newStatus = patch.status;

  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  if (newStatus === "done") $set.completed_at = new Date();
  if (newStatus && newStatus !== "done") $set.completed_at = null;

  const col = await collection();
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<Task>,
    { $set },
    { returnDocument: "after" }
  );
  if (!result) return null;

  // Cascade down on manual flips to done/todo (no-op on "doing").
  if (willChangeStatus && (newStatus === "done" || newStatus === "todo")) {
    await cascadeStatusDown(id, newStatus);
  }
  // Propagate up: a leaf flipping done may auto-complete its parent.
  if (willChangeStatus && existing.parent_task_id) {
    await propagateCompletion(existing.parent_task_id);
  }

  return TaskSchema.parse(result);
}

export async function remove(id: string): Promise<boolean> {
  const col = await collection();
  const existing = await col.findOne({ _id: id } as Filter<Task>);
  // Recursive subtask cleanup
  const children = await col.find({ parent_task_id: id }).toArray();
  for (const child of children) await remove(child._id);
  await (await instancesCollection()).deleteMany({ task_id: id });
  const result = await col.deleteOne({ _id: id } as Filter<Task>);
  // After deletion, re-evaluate the parent's completion state.
  if (existing?.parent_task_id) {
    await propagateCompletion(existing.parent_task_id);
  }
  return result.deletedCount === 1;
}

// ---------- Cascade / propagation ----------

async function cascadeStatusDown(taskId: string, status: TaskStatus): Promise<void> {
  const col = await collection();
  const children = await col.find({ parent_task_id: taskId }).toArray();
  for (const child of children) {
    const $set: Record<string, unknown> = {
      status,
      updated_at: new Date(),
    };
    if (status === "done") $set.completed_at = new Date();
    else $set.completed_at = null;
    await col.updateOne({ _id: child._id } as Filter<Task>, { $set });
    await cascadeStatusDown(child._id, status);
  }
}

async function propagateCompletion(parentTaskId: string): Promise<void> {
  const parent = await get(parentTaskId);
  if (!parent) return;
  const col = await collection();
  const children = await col.find({ parent_task_id: parentTaskId }).toArray();
  if (children.length === 0) return;
  const allDone = children.every((c) => c.status === "done");

  let newStatus: TaskStatus | null = null;
  if (allDone && parent.status !== "done") newStatus = "done";
  else if (!allDone && parent.status === "done") newStatus = "todo";

  if (newStatus !== null) {
    const $set: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date(),
    };
    if (newStatus === "done") $set.completed_at = new Date();
    else $set.completed_at = null;
    await col.updateOne({ _id: parent._id } as Filter<Task>, { $set });
    if (parent.parent_task_id) {
      await propagateCompletion(parent.parent_task_id);
    }
  }
}

// ---------- Recurrence per-occurrence completion ----------

export async function toggleOccurrence(
  taskId: string,
  occurrenceDate: Date
): Promise<TaskInstance> {
  const col = await instancesCollection();
  const date = new Date(
    Date.UTC(
      occurrenceDate.getUTCFullYear(),
      occurrenceDate.getUTCMonth(),
      occurrenceDate.getUTCDate()
    )
  );
  const existing = await col.findOne({ task_id: taskId, occurrence_date: date });
  if (existing) {
    const next = existing.completed_at ? null : new Date();
    const result = await col.findOneAndUpdate(
      { _id: existing._id } as Filter<TaskInstance>,
      { $set: { completed_at: next } },
      { returnDocument: "after" }
    );
    return TaskInstanceSchema.parse(result);
  }
  const instance: TaskInstance = {
    _id: randomUUID(),
    task_id: taskId,
    occurrence_date: date,
    completed_at: new Date(),
  };
  await col.insertOne(instance);
  return instance;
}

export async function getInstances(
  taskId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<TaskInstance[]> {
  const col = await instancesCollection();
  const docs = await col
    .find({
      task_id: taskId,
      occurrence_date: { $gte: rangeStart, $lte: rangeEnd },
    })
    .toArray();
  return docs.map((d) => TaskInstanceSchema.parse(d));
}

export type Occurrence = { date: Date; completed: boolean };

export async function getOccurrencesForGoal(
  goalId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Record<string, Occurrence[]>> {
  const taskCol = await collection();
  const recurring = await taskCol
    .find({ goal_id: goalId, recurrence: { $ne: null } })
    .toArray();
  if (recurring.length === 0) return {};
  const parsed = recurring.map((d) => TaskSchema.parse(d));

  const instCol = await instancesCollection();
  const instances = await instCol
    .find({
      task_id: { $in: parsed.map((t) => t._id) },
      occurrence_date: { $gte: rangeStart, $lte: rangeEnd },
    })
    .toArray();

  const dayKey = (d: Date) =>
    `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  const completedSet = new Set<string>();
  for (const i of instances) {
    if (i.completed_at) {
      completedSet.add(`${i.task_id}|${dayKey(new Date(i.occurrence_date))}`);
    }
  }

  const out: Record<string, Occurrence[]> = {};
  for (const t of parsed) {
    if (!t.recurrence) continue;
    const anchor = t.due_date ?? t.created_at;
    const dates = expandRecurrence(t.recurrence, anchor, rangeStart, rangeEnd);
    out[t._id] = dates.map((date) => ({
      date,
      completed: completedSet.has(`${t._id}|${dayKey(date)}`),
    }));
  }
  return out;
}

// ---------- Progress computation ----------

export type ProgressPoint = { date: Date; pct: number };

export type GoalProgress = {
  progress_pct: number;
  planned_pct: number;
  history: ProgressPoint[];
};

/**
 * Compute current progress + history from a goal's tasks.
 * Pure, side-effect free — caller fetches tasks once and passes in.
 */
export function computeGoalProgress(allTasks: Task[]): GoalProgress {
  const nonRecurring = allTasks.filter((t) => !t.recurrence);
  const roots = nonRecurring.filter((t) => !t.parent_task_id);

  const childrenOf = (parentId: string) =>
    nonRecurring.filter((t) => t.parent_task_id === parentId);

  const effectiveCompletedWeight = (task: Task): number => {
    const kids = childrenOf(task._id);
    if (kids.length === 0) return task.status === "done" ? task.weight : 0;
    return kids.reduce((sum, c) => sum + effectiveCompletedWeight(c), 0);
  };

  const progress_pct = roots.reduce((s, r) => s + effectiveCompletedWeight(r), 0);
  const planned_pct = roots.reduce((s, r) => s + r.weight, 0);

  // History: only leaves contribute discrete events. Sorted by completed_at.
  const isLeaf = (t: Task) => childrenOf(t._id).length === 0;
  const events = nonRecurring
    .filter(
      (t) =>
        isLeaf(t) &&
        t.status === "done" &&
        t.completed_at != null &&
        t.weight > 0
    )
    .sort((a, b) => +a.completed_at! - +b.completed_at!);

  let runningPct = 0;
  const history: ProgressPoint[] = [];
  for (const e of events) {
    runningPct += e.weight;
    history.push({ date: e.completed_at!, pct: runningPct });
  }

  return { progress_pct, planned_pct, history };
}
