"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { StreakChip } from "./StreakChip";
import { HabitStrip, type StripDay } from "./HabitStrip";
import { DayChipPicker } from "./DayChipPicker";
import { deleteHabitAction, setHabitWeekdaysAction } from "@/app/actions/habits";
import type { Task } from "@/lib/schemas";

export function HabitRow({
  task,
  days,
  weekdays,
  current,
  longest,
  goalTitle,
}: {
  task: Task;
  days: StripDay[];
  weekdays: number[];
  current: number;
  longest: number;
  goalTitle?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border/30 bg-card/40 px-4 py-3 transition-colors hover:bg-card/60">
      <div className="min-w-0 flex-1">
        <h3 className="priv truncate text-sm font-medium">{task.title}</h3>
        {goalTitle && (
          <p className="priv mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            via {goalTitle}
          </p>
        )}
      </div>

      <div className="shrink-0">
        <DayChipPicker
          value={weekdays}
          onChange={(next) =>
            startTransition(() => setHabitWeekdaysAction(task._id, next))
          }
          disabled={pending}
          size="sm"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <StreakChip value={current} label="now" accent />
        <StreakChip value={longest} label="best" />
      </div>

      <div className="shrink-0">
        <HabitStrip taskId={task._id} goalId={task.goal_id} days={days} />
      </div>

      <button
        type="button"
        onClick={() => {
          if (confirm("Delete this habit?"))
            startTransition(() => deleteHabitAction(task._id));
        }}
        disabled={pending}
        title="Delete"
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
