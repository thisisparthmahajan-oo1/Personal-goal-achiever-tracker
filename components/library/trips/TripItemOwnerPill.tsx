"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { updateTripItemAction } from "@/app/actions/trips";
import { cn } from "@/lib/utils";

/**
 * Deterministic color per owner string, so each person gets a consistent pill
 * across the trip without us having to model owners as first-class entities.
 */
const PALETTE = [
  "border-purple-500/40 bg-purple-500/15 text-purple-200",
  "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  "border-sky-500/40 bg-sky-500/15 text-sky-200",
  "border-rose-500/40 bg-rose-500/15 text-rose-200",
  "border-orange-500/40 bg-orange-500/15 text-orange-200",
];
function colorFor(owner: string): string {
  let h = 0;
  for (let i = 0; i < owner.length; i++) h = (h * 31 + owner.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function TripItemOwnerPill({
  itemId,
  owner,
}: {
  itemId: string;
  owner: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(owner ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(owner ?? ""), [owner]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next === (owner ?? "").trim()) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await updateTripItemAction(itemId, { owner: next || null });
      setEditing(false);
    });
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(owner ?? "");
            setEditing(false);
          }
        }}
        disabled={pending}
        maxLength={80}
        placeholder="Owner"
        className="priv w-24 rounded-md border border-primary/40 bg-card/60 px-2 py-0.5 text-[11px] outline-none"
      />
    );
  }

  if (!owner) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Assign owner"
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground/70 hover:border-primary/40 hover:text-foreground"
      >
        <Plus className="size-2.5" />
        Owner
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit owner"
      className={cn(
        "priv inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium hover:opacity-80",
        colorFor(owner)
      )}
    >
      {owner}
    </button>
  );
}
