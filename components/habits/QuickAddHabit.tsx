"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createHabitAction } from "@/app/actions/habits";
import { DayChipPicker } from "./DayChipPicker";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function QuickAddHabit() {
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [pending, startTransition] = useTransition();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = title.trim();
    if (!t || days.length === 0) return;
    startTransition(async () => {
      await createHabitAction({ title: t, weekdays: days });
      setTitle("");
      setDays(ALL_DAYS);
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2"
    >
      <Plus className="size-4 text-muted-foreground shrink-0" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setTitle("");
            setDays(ALL_DAYS);
          }
        }}
        placeholder="Add a habit…"
        disabled={pending}
        className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <DayChipPicker value={days} onChange={setDays} disabled={pending} size="sm" />
      <button
        type="submit"
        disabled={pending || !title.trim() || days.length === 0}
        className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
