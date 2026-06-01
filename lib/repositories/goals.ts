import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { getCollection } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import {
  GoalSchema,
  TaskSchema,
  type Goal,
  type GoalInput,
  type GoalPatch,
  type GoalSummary,
  type Status,
  type Task,
  type TaskInstance,
} from "@/lib/schemas";
import {
  computeGoalProgress,
  type ProgressPoint,
} from "@/lib/repositories/tasks";

const COLLECTION = "goals";

async function collection() {
  return getCollection<Goal>(COLLECTION);
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
  const profileId = await getActiveProfileId();
  const goal: Goal = {
    _id: randomUUID(),
    profile_id: profileId,
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
  const goalsCol = await collection();
  const tasksCol = await getCollection<Task>("tasks");
  const instancesCol = await getCollection<TaskInstance>("task_instances");
  const taskIds = (
    await tasksCol
      .find({ goal_id: id }, { projection: { _id: 1 } })
      .toArray()
  ).map((t) => t._id);
  if (taskIds.length > 0) {
    await instancesCol.deleteMany({ task_id: { $in: taskIds } } as Filter<TaskInstance>);
  }
  await tasksCol.deleteMany({ goal_id: id } as Filter<Task>);
  const result = await goalsCol.deleteOne({ _id: id } as Filter<Goal>);
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
  const tasksCol = await getCollection<Task>("tasks");
  const tasks = await tasksCol
    .find({ goal_id: { $in: goals.map((g) => g._id) } } as Filter<Task>)
    .toArray();
  const tasksByGoal = new Map<string, Task[]>();
  for (const t of tasks) {
    const parsed = TaskSchema.parse(t);
    if (!parsed.goal_id) continue; // standalone habit, not part of any goal
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
  const tasksCol = await getCollection<Task>("tasks");
  const docs = await tasksCol.find({ goal_id: goalId } as Filter<Task>).toArray();
  const tasks = docs.map((d) => TaskSchema.parse(d));
  return computeGoalProgress(tasks).history;
}
