"use client";

import { useState, useTransition } from "react";
import { Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { setRecurrenceAction } from "@/app/actions/tasks";
import type { RecurrenceRule, Frequency } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function RecurrenceDialog({
  taskId,
  goalId,
  current,
  disabled = false,
}: {
  taskId: string;
  goalId: string;
  current: RecurrenceRule | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [freq, setFreq] = useState<Frequency>(current?.freq ?? "weekly");
  const [interval, setInterval] = useState<number>(current?.interval ?? 1);
  const [weekdays, setWeekdays] = useState<number[]>(current?.weekdays ?? []);
  const [endDate, setEndDate] = useState<string>(
    current?.end_date
      ? new Date(current.end_date).toISOString().slice(0, 10)
      : ""
  );
  const [pending, startTransition] = useTransition();

  const save = () => {
    const rule: RecurrenceRule = {
      freq,
      interval: Math.max(1, interval),
      weekdays: freq === "weekly" && weekdays.length > 0 ? [...weekdays].sort() : null,
      end_date: endDate ? new Date(endDate) : null,
    };
    startTransition(async () => {
      await setRecurrenceAction(taskId, goalId, rule);
      setOpen(false);
    });
  };

  const clear = () => {
    startTransition(async () => {
      await setRecurrenceAction(taskId, goalId, null);
      setOpen(false);
    });
  };

  const toggleDay = (d: number) => {
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]));
  };

  // If the task can't become recurring AND isn't already recurring, don't
  // render anything — a greyed-out icon next to every weighted task is just
  // visual noise.
  if (disabled && !current) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            title={current ? "Edit recurrence" : "Make this task recurring (habit)"}
            className={cn(
              "rounded p-1 transition-colors",
              current
                ? "text-primary hover:bg-primary/15"
                : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground"
            )}
          >
            <Repeat className="size-3.5" />
          </button>
        }
      />
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle>Recurrence</DialogTitle>
          <DialogDescription>
            Schedule this task to repeat on a fixed cadence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="uppercase text-xs tracking-[0.18em] text-muted-foreground">
              Frequency
            </Label>
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFreq(f)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors",
                    freq === f
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="interval" className="uppercase text-xs tracking-[0.18em] text-muted-foreground">
                Every
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="interval"
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value) || 1)}
                  className="w-20 text-center font-mono"
                />
                <span className="text-sm text-muted-foreground">
                  {freq === "daily" ? "day(s)" : freq === "weekly" ? "week(s)" : "month(s)"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="uppercase text-xs tracking-[0.18em] text-muted-foreground">
                End date
              </Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {freq === "weekly" && (
            <div className="space-y-2">
              <Label className="uppercase text-xs tracking-[0.18em] text-muted-foreground">
                On days
              </Label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => {
                  const active = weekdays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to use the task's start day.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {current && (
            <Button variant="outline" size="sm" onClick={clear} disabled={pending}>
              Clear recurrence
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={pending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
