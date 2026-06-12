"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createMeetingSeriesAction } from "@/app/actions/meetings";

export function NewSeriesForm() {
  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState("");
  const [attendees, setAttendees] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      await createMeetingSeriesAction({
        title: t,
        cadence_label: cadence.trim() || null,
        default_attendees: attendees.trim() || null,
      });
      setTitle("");
      setCadence("");
      setAttendees("");
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-xl border border-border/40 bg-card/40 p-3"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New series title (e.g. Weekly 1:1 with Anand)"
        disabled={pending}
        maxLength={200}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={cadence}
          onChange={(e) => setCadence(e.target.value)}
          placeholder="Cadence (Mondays 4pm, biweekly, etc.)"
          disabled={pending}
          maxLength={100}
          className="min-w-[180px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
        <input
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          placeholder="Default attendees (optional)"
          disabled={pending}
          maxLength={500}
          className="min-w-[220px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Plus className="size-3" />
          Add series
        </button>
      </div>
    </form>
  );
}
