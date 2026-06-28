"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTripAction } from "@/app/actions/trips";

export function NewTripForm() {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      const trip = await createTripAction({
        title: t,
        destination: destination.trim() || null,
      });
      setTitle("");
      setDestination("");
      setOpen(false);
      if (trip) router.push(`/library/trips/${trip._id}`);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border/40 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-foreground"
      >
        <Plus className="size-3" />
        New trip
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card/40 p-3"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setTitle("");
            setDestination("");
            setOpen(false);
          }
        }}
        placeholder="Trip title — e.g. Bali 2026"
        disabled={pending}
        maxLength={200}
        className="min-w-[200px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <input
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder="Destination (optional)"
        disabled={pending}
        maxLength={200}
        className="w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
      >
        Create
      </button>
      <button
        type="button"
        onClick={() => {
          setTitle("");
          setDestination("");
          setOpen(false);
        }}
        disabled={pending}
        className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}
