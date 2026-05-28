"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toggleOccurrenceAction } from "@/app/actions/tasks";
import { StreakChip } from "./StreakChip";
import type { Task } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function TodayTile({
  task,
  completed,
  currentStreak,
}: {
  task: Task;
  completed: boolean;
  currentStreak: number;
}) {
  const [pending, startTransition] = useTransition();
  const toggle = () => {
    const today = new Date();
    startTransition(() =>
      toggleOccurrenceAction(task._id, task.goal_id ?? "", today.toISOString())
    );
  };
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "group relative isolate flex min-w-[200px] flex-col gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300",
        completed
          ? "border-primary/40 bg-primary/10"
          : "border-border/40 bg-card/60 hover:border-primary/30 hover:bg-card/80",
        pending && "opacity-70"
      )}
      style={{
        boxShadow: completed
          ? "inset 0 1px 0 oklch(1 0 0 / 0.06), 0 0 24px oklch(0.66 0.22 285 / 0.2)"
          : "inset 0 1px 0 oklch(1 0 0 / 0.05)",
      }}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "priv text-sm font-semibold tracking-tight",
            completed && "text-primary"
          )}
        >
          {task.title}
        </span>
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
            completed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/60 bg-muted/30"
          )}
          style={
            completed
              ? { boxShadow: "0 0 12px oklch(0.66 0.22 285 / 0.6)" }
              : undefined
          }
        >
          {completed && <Check className="size-4" />}
        </div>
      </div>

      <StreakChip value={currentStreak} label="streak" accent />
    </button>
  );
}
