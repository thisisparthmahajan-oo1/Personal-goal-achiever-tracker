import type { Task } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Mon-first ordering, underlying values use JS getDay (0=Sun..6=Sat).
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0];

export function WeeklyRoutine({
  habits,
  weekdaysByHabit,
}: {
  habits: Task[];
  weekdaysByHabit: Record<string, number[]>;
}) {
  const today = new Date().getDay();

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAY_INDEX.map((d, i) => {
        const dayHabits = habits.filter((h) =>
          weekdaysByHabit[h._id]?.includes(d)
        );
        const isToday = today === d;
        return (
          <div
            key={d}
            className={cn(
              "relative flex min-h-[120px] flex-col gap-2 overflow-hidden rounded-xl border p-3 transition-colors",
              isToday
                ? "border-primary/40 bg-primary/[0.06]"
                : "border-border/30 bg-card/30"
            )}
          >
            {isToday && (
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            )}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[10px] font-mono uppercase tracking-[0.18em]",
                  isToday ? "text-primary" : "text-muted-foreground/70"
                )}
              >
                {DAY_NAMES[i]}
              </span>
              {isToday && (
                <span
                  className="size-1 rounded-full bg-primary"
                  style={{ boxShadow: "0 0 6px oklch(0.66 0.22 285)" }}
                />
              )}
            </div>
            <ul className="space-y-1">
              {dayHabits.length === 0 ? (
                <li className="text-[10px] italic text-muted-foreground/40">
                  —
                </li>
              ) : (
                dayHabits.map((h) => (
                  <li
                    key={h._id}
                    className="priv truncate rounded-md bg-muted/30 px-2 py-1 text-[11px] text-foreground/90"
                  >
                    {h.title}
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
