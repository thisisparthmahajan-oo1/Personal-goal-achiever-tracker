"use server";

import { revalidatePath } from "next/cache";
import * as stash from "@/lib/repositories/stash";

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  // Preserve any explicit URI scheme (http, https, file, ftp, mailto, ...).
  if (/^[a-z][a-z0-9+\-.]*:/i.test(t)) return t;
  return `https://${t}`;
}

export async function createStashItemAction(input: {
  label: string;
  url?: string | null;
  note?: string | null;
}) {
  const label = input.label.trim();
  const url = input.url ? normalizeUrl(input.url) : null;
  const note = input.note?.trim() || null;
  // Require at least a label, and one of (url, note) so we never save a bare title.
  if (!label) return;
  if (!url && !note) return;
  await stash.create({ label, url, note });
  revalidatePath("/library/stash");
  revalidatePath("/library");
}

export async function updateStashItemAction(
  id: string,
  patch: { label?: string; url?: string | null; note?: string | null }
) {
  const existing = await stash.get(id);
  if (!existing) return;
  const next: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const t = patch.label.trim();
    if (!t) return;
    next.label = t;
  }
  if (patch.url !== undefined) {
    next.url = patch.url ? normalizeUrl(patch.url) : null;
  }
  if (patch.note !== undefined) {
    next.note = patch.note?.trim() || null;
  }
  await stash.update(id, next);
  revalidatePath("/library/stash");
}

export async function deleteStashItemAction(id: string) {
  await stash.remove(id);
  revalidatePath("/library/stash");
  revalidatePath("/library");
}
