"use client";

import { useTransition } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { toggleOccurrenceAction } from "@/app/actions/tasks";
import { cn } from "@/lib/utils";

export type StripDay = {
  date: Date;
  scheduled: boolean;
  completed: boolean;
};

export function HabitStrip({
  taskId,
  goalId,
  days,
}: {
  taskId: string;
  goalId: string | null;
  days: StripDay[];
}) {
  const [pending, startTransition] = useTransition();
  const today = startOfDay(new Date());

  return (
    // .priv lives on each cell, not the wrapper, so the tooltip — which is a
    // sibling, not a .priv — stays crisp even when privacy mode is hiding the
    // strip.
    <div className="flex gap-0.5">
      {days.map((c, idx) => {
        const isToday = isSameDay(c.date, today);
        const handle = () =>
          startTransition(() =>
            toggleOccurrenceAction(taskId, goalId ?? "", c.date.toISOString())
          );
        const cellClass = c.completed
          ? c.scheduled
            ? "bg-primary"
            : "bg-[oklch(0.74_0.14_175)]/85"
          : c.scheduled
          ? "border border-border/60 bg-muted/30 hover:border-primary/40"
          : "bg-muted/15 hover:bg-muted/35";
        return (
          <div key={idx} className="group/cell relative">
            <button
              type="button"
              disabled={pending}
              onClick={handle}
              className={cn(
                "priv size-3.5 rounded-sm transition-colors",
                cellClass,
                isToday && "ring-1 ring-primary/50",
                pending && "opacity-60"
              )}
              style={
                c.completed
                  ? {
                      boxShadow: c.scheduled
                        ? "0 0 6px oklch(0.66 0.22 285 / 0.55)"
                        : "0 0 6px oklch(0.74 0.14 175 / 0.45)",
                    }
                  : undefined
              }
            />
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-popover px-2 py-1 text-[10px] font-mono text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/cell:opacity-100"
            >
              <span className="text-muted-foreground/70">
                {format(c.date, "EEE")}
              </span>{" "}
              <span data-numeric>{format(c.date, "MMM d")}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
