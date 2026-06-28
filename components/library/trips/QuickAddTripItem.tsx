"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTripItemAction } from "@/app/actions/trips";

export function QuickAddTripItem({ tripId }: { tripId: string }) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createTripItemAction({
        trip_id: tripId,
        name: trimmed,
        owner: owner.trim() || null,
      });
      setName("");
      setOwner("");
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-card/40 p-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setName("");
            setOwner("");
          }
        }}
        placeholder="What needs picking — e.g. Activities, Visa, Stay"
        disabled={pending}
        className="min-w-[200px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        maxLength={300}
      />
      <input
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        placeholder="Owner (optional)"
        disabled={pending}
        className="w-32 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        maxLength={80}
      />
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
      >
        <Plus className="size-3" />
        Add
      </button>
    </form>
  );
}
