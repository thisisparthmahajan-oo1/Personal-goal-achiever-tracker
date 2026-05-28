"use client";

import { useTransition } from "react";
import { format, isSameDay } from "date-fns";
import { toggleOccurrenceAction } from "@/app/actions/tasks";
import type { Occurrence } from "@/lib/repositories/tasks";
import { cn } from "@/lib/utils";

export function OccurrenceStrip({
  taskId,
  goalId,
  occurrences,
}: {
  taskId: string;
  goalId: string;
  occurrences: Occurrence[];
}) {
  const [pending, startTransition] = useTransition();
  if (occurrences.length === 0) return null;
  const today = new Date();

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {occurrences.map((o) => {
        const todayMatch = isSameDay(o.date, today);
        return (
          <button
            key={o.date.toISOString()}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                toggleOccurrenceAction(taskId, goalId, o.date.toISOString())
              )
            }
            title={format(o.date, "EEE MMM d")}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-md border px-1.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors min-w-[34px]",
              o.completed
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              todayMatch && !o.completed && "border-primary/50",
              pending && "opacity-60"
            )}
          >
            <span data-numeric className="font-mono text-[11px] leading-none">
              {format(o.date, "d")}
            </span>
            <span className="leading-none">{format(o.date, "EEE").slice(0, 2)}</span>
          </button>
        );
      })}
    </div>
  );
}
