"use server";

import { revalidatePath } from "next/cache";
import * as goalResources from "@/lib/repositories/goal-resources";

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  // Preserve any explicit URI scheme (http, https, file, ftp, mailto, ...).
  // Otherwise assume the user typed a bare host/path and prefix https://.
  if (/^[a-z][a-z0-9+\-.]*:/i.test(t)) return t;
  return `https://${t}`;
}

export async function createGoalResourceAction(input: {
  goal_id: string;
  label: string;
  url: string;
}) {
  const label = input.label.trim();
  const url = normalizeUrl(input.url);
  if (!label || !url) return;
  await goalResources.create({
    goal_id: input.goal_id,
    label,
    url,
  });
  revalidatePath(`/goals/${input.goal_id}`);
}

export async function updateGoalResourceAction(
  id: string,
  patch: { label?: string; url?: string }
) {
  const existing = await goalResources.get(id);
  if (!existing) return;
  const next: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const t = patch.label.trim();
    if (!t) return;
    next.label = t;
  }
  if (patch.url !== undefined) {
    const t = normalizeUrl(patch.url);
    if (!t) return;
    next.url = t;
  }
  await goalResources.update(id, next);
  revalidatePath(`/goals/${existing.goal_id}`);
}

export async function deleteGoalResourceAction(id: string) {
  const existing = await goalResources.get(id);
  if (!existing) return;
  await goalResources.remove(id);
  revalidatePath(`/goals/${existing.goal_id}`);
}
