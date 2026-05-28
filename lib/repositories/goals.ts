import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getDb } from "@/lib/db";
import {
  GoalSchema,
  TaskSchema,
  type Goal,
  type GoalInput,
  type GoalPatch,
  type GoalSummary,
  type Status,
  type Task,
} from "@/lib/schemas";
import {
  computeGoalProgress,
  type ProgressPoint,
} from "@/lib/repositories/tasks";

const COLLECTION = "goals";

async function collection() {
  const db = await getDb();
  return db.collection<Goal>(COLLECTION);
}

export async function list(filter?: { status?: Status }): Promise<Goal[]> {
  const col = await collection();
  const q = filter?.status ? { status: filter.status } : {};
  const docs = await col.find(q).sort({ created_at: -1 }).toArray();
  return docs.map((d) => GoalSchema.parse(d));
}

export async function get(id: string): Promise<Goal | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: id } as Filter<Goal>);
  return doc ? GoalSchema.parse(doc) : null;
}

export async function create(input: GoalInput): Promise<Goal> {
  const col = await collection();
  const now = new Date();
  const goal: Goal = {
    _id: randomUUID(),
    title: input.title,
    description: input.description ?? null,
    target_date: input.target_date ?? null,
    status: input.status ?? "active",
    source: input.source ?? null,
    created_at: now,
    updated_at: now,
  };
  await col.insertOne(goal);
  return goal;
}

export async function update(id: string, patch: GoalPatch): Promise<Goal | null> {
  const col = await collection();
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const result = await col.findOneAndUpdate(
    { _id: id } as Filter<Goal>,
    { $set },
    { returnDocument: "after" }
  );
  return result ? GoalSchema.parse(result) : null;
}

export async function remove(id: string): Promise<boolean> {
  const db = await getDb();
  const taskIds = (
    await db
      .collection<Task>("tasks")
      .find({ goal_id: id }, { projection: { _id: 1 } })
      .toArray()
  ).map((t) => t._id);
  if (taskIds.length > 0) {
    await db.collection("task_instances").deleteMany({ task_id: { $in: taskIds } });
  }
  await db.collection("tasks").deleteMany({ goal_id: id });
  const result = await db.collection<Goal>(COLLECTION).deleteOne({ _id: id } as Filter<Goal>);
  return result.deletedCount === 1;
}

/**
 * Dashboard summary: for each active goal, compute weighted progress and a
 * recent slice of the progress history. N+1 fetches; fine for a personal-scale
 * dataset and far simpler than a giant aggregation.
 */
export async function getDashboardSummary(): Promise<GoalSummary[]> {
  const goals = await list({ status: "active" });
  if (goals.length === 0) return [];
  const db = await getDb();
  const tasks = await db
    .collection<Task>("tasks")
    .find({ goal_id: { $in: goals.map((g) => g._id) } })
    .toArray();
  const tasksByGoal = new Map<string, Task[]>();
  for (const t of tasks) {
    const parsed = TaskSchema.parse(t);
    const arr = tasksByGoal.get(parsed.goal_id) ?? [];
    arr.push(parsed);
    tasksByGoal.set(parsed.goal_id, arr);
  }
  return goals.map((g) => {
    const goalTasks = tasksByGoal.get(g._id) ?? [];
    const { progress_pct, planned_pct, history } = computeGoalProgress(goalTasks);
    const recent_progress = history.slice(-8);
    return {
      ...g,
      progress_pct,
      planned_pct,
      recent_progress,
    } satisfies GoalSummary;
  });
}

export async function getProgressHistory(goalId: string): Promise<ProgressPoint[]> {
  const db = await getDb();
  const docs = await db.collection<Task>("tasks").find({ goal_id: goalId }).toArray();
  const tasks = docs.map((d) => TaskSchema.parse(d));
  return computeGoalProgress(tasks).history;
}
