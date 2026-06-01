import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import {
  TaskSchema,
  TaskInstanceSchema,
  type Task,
  type TaskInput,
  type TaskPatch,
  type TaskInstance,
  type TaskStatus,
} from "@/lib/schemas";
import { addDays, format } from "date-fns";
import { expandRecurrence, startOfDay } from "@/lib/recurrence";

// Shared local-calendar-day key used across the file so occurrence dates
// (UTC midnight of a local day) compare consistently with "today".
function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

const COLLECTION = "tasks";
const INSTANCES = "task_instances";

async function collection() {
  return getCollection<Task>(COLLECTION);
}

async function instancesCollection() {
  return getCollection<TaskInstance>(INSTANCES);
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
  goal_id: string | null;
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
  goal_id?: string | null;
  status?: TaskStatus;
  parent_task_id?: string | null;
}): Promise<Task[]> {
  const col = await collection();
  const q: Record<string, unknown> = {};
  if (filter?.goal_id !== undefined) q.goal_id = filter.goal_id;
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
  const profileId = await getActiveProfileId();
  const task: Task = {
    _id: randomUUID(),
    profile_id: profileId,
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
  // Normalize to UTC midnight of the LOCAL calendar day — matches the
  // normalization used by expandRecurrence so instance lookups line up.
  const date = new Date(
    Date.UTC(
      occurrenceDate.getFullYear(),
      occurrenceDate.getMonth(),
      occurrenceDate.getDate()
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
  const profileId = await getActiveProfileId();
  const instance: TaskInstance = {
    _id: randomUUID(),
    profile_id: profileId,
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

// ---------- Habits ----------

/**
 * All recurring tasks across the system — both goal-attached and standalone.
 */
export async function listHabits(): Promise<Task[]> {
  const col = await collection();
  const docs = await col
    .find({ recurrence: { $ne: null } })
    .sort({ created_at: -1 })
    .toArray();
  return docs.map((d) => TaskSchema.parse(d));
}

/**
 * Cross-goal version of getOccurrencesForGoal. Expands recurrence for every
 * recurring task and joins with task_instances within the window.
 */
export async function getAllOccurrences(
  rangeStart: Date,
  rangeEnd: Date
): Promise<Record<string, Occurrence[]>> {
  const taskCol = await collection();
  const recurring = await taskCol
    .find({ recurrence: { $ne: null } })
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

/**
 * Fetch every recorded instance for a set of task ids (no date bound).
 * Used by streak computation, which needs to see the full history.
 */
export async function getAllInstancesForTasks(
  taskIds: string[]
): Promise<Record<string, TaskInstance[]>> {
  const out: Record<string, TaskInstance[]> = {};
  for (const id of taskIds) out[id] = [];
  if (taskIds.length === 0) return out;
  const col = await instancesCollection();
  const docs = await col.find({ task_id: { $in: taskIds } }).toArray();
  for (const d of docs) {
    const parsed = TaskInstanceSchema.parse(d);
    (out[parsed.task_id] ??= []).push(parsed);
  }
  return out;
}

/**
 * Effective list of weekdays a habit is scheduled on (0=Sun..6=Sat).
 * Legacy "daily" habits are treated as every weekday so the routine view
 * works without a migration pass.
 */
export function getHabitWeekdays(task: Task): number[] {
  if (!task.recurrence) return [];
  if (task.recurrence.freq === "daily") return [0, 1, 2, 3, 4, 5, 6];
  if (task.recurrence.freq === "weekly") {
    return task.recurrence.weekdays && task.recurrence.weekdays.length > 0
      ? task.recurrence.weekdays
      : [0, 1, 2, 3, 4, 5, 6];
  }
  return []; // monthly habits don't sit on the weekly routine grid
}

export type Streaks = {
  current: number;
  longest: number;
  last_completed: Date | null;
};

/**
 * Compute streaks from the routine itself: every day whose weekday is in the
 * habit's weekdays counts as a routine day. Streaks reward consistency on
 * those days regardless of when the task object was created.
 *
 * Window starts at the earlier of (created_at, earliest completed instance)
 * so retroactively-logged days count.
 *
 * Rule: an unfinished TODAY does not break the streak — the day is still
 * "decidable." Only a past routine day that was missed breaks it.
 */
export function computeStreaks(
  task: Task,
  instances: TaskInstance[]
): Streaks {
  if (!task.recurrence) {
    return { current: 0, longest: 0, last_completed: null };
  }
  const weekdays = getHabitWeekdays(task);
  if (weekdays.length === 0) {
    return { current: 0, longest: 0, last_completed: null };
  }

  const completedSet = new Set<string>();
  let earliestCompleted: Date | null = null;
  let lastCompleted: Date | null = null;
  for (const i of instances) {
    if (!i.completed_at) continue;
    const d = new Date(i.occurrence_date);
    completedSet.add(dayKey(d));
    if (!earliestCompleted || d < earliestCompleted) earliestCompleted = d;
    if (!lastCompleted || d > lastCompleted) lastCompleted = d;
  }

  const originalAnchor = startOfDay(task.due_date ?? task.created_at);
  const startDate =
    earliestCompleted && earliestCompleted < originalAnchor
      ? startOfDay(earliestCompleted)
      : originalAnchor;
  const today = startOfDay(new Date());

  const routineDays: Date[] = [];
  let cursor = startDate;
  while (cursor <= today) {
    if (weekdays.includes(cursor.getDay())) routineDays.push(cursor);
    cursor = addDays(cursor, 1);
  }
  if (routineDays.length === 0) {
    return { current: 0, longest: 0, last_completed: lastCompleted };
  }

  // Longest run
  let longest = 0;
  let run = 0;
  for (const d of routineDays) {
    if (completedSet.has(dayKey(d))) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current streak walking back from today; if today is a routine day and not
  // yet completed, skip it (still decidable).
  const desc = [...routineDays].sort((a, b) => +b - +a);
  const todayKey = dayKey(today);
  let startIdx = 0;
  if (
    dayKey(desc[0]) === todayKey &&
    !completedSet.has(todayKey)
  ) {
    startIdx = 1;
  }
  let current = 0;
  for (let i = startIdx; i < desc.length; i++) {
    if (completedSet.has(dayKey(desc[i]))) current++;
    else break;
  }

  return { current, longest, last_completed: lastCompleted };
}
