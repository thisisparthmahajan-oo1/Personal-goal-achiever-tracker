import { subDays, startOfDay, format } from "date-fns";
import { TodayTile } from "@/components/habits/TodayTile";
import { HabitRow } from "@/components/habits/HabitRow";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { QuickAddHabit } from "@/components/habits/QuickAddHabit";
import { WeeklyRoutine } from "@/components/habits/WeeklyRoutine";
import {
  listHabits,
  getAllOccurrences,
  getAllInstancesForTasks,
  computeStreaks,
  getHabitWeekdays,
} from "@/lib/repositories/tasks";
import { list as listGoals } from "@/lib/repositories/goals";

export const dynamic = "force-dynamic";

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default async function HabitsPage() {
  const today = startOfDay(new Date());
  const todayDow = new Date().getDay(); // 0=Sun..6=Sat
  const stripStart = subDays(today, 29);
  const heatmapStart = subDays(today, 89);

  const habits = await listHabits();
  const taskIds = habits.map((h) => h._id);

  const [occurrences90, allInstances, goals] = await Promise.all([
    getAllOccurrences(heatmapStart, today),
    getAllInstancesForTasks(taskIds),
    listGoals(),
  ]);

  const goalById = new Map(goals.map((g) => [g._id, g.title]));
  const todayKey = dayKey(today);

  const weekdaysByHabit: Record<string, number[]> = {};
  for (const h of habits) weekdaysByHabit[h._id] = getHabitWeekdays(h);

  const enriched = habits.map((h) => {
    const occs90 = occurrences90[h._id] ?? [];
    const instances = allInstances[h._id] ?? [];
    const weekdays = weekdaysByHabit[h._id];

    const scheduledSet = new Set<string>();
    for (const o of occs90) scheduledSet.add(dayKey(new Date(o.date)));
    const completedSet = new Set<string>();
    for (const i of instances) {
      if (i.completed_at)
        completedSet.add(dayKey(new Date(i.occurrence_date)));
    }

    const days30 = [] as {
      date: Date;
      scheduled: boolean;
      completed: boolean;
    }[];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      const k = dayKey(d);
      days30.push({
        date: d,
        scheduled: scheduledSet.has(k),
        completed: completedSet.has(k),
      });
    }

    const streaks = computeStreaks(h, instances);
    const scheduledToday = weekdays.includes(todayDow);
    const doneToday = completedSet.has(todayKey);

    return {
      task: h,
      days30,
      weekdays,
      streaks,
      scheduledToday,
      doneToday,
      goalTitle: h.goal_id ? goalById.get(h.goal_id) : undefined,
    };
  });

  // Stable ordering — by creation time, oldest first. Editing the routine or
  // completing/uncompleting a habit must not shuffle the list.
  const sortedAll = [...enriched].sort(
    (a, b) => +a.task.created_at - +b.task.created_at
  );

  const todayHabits = enriched.filter((e) => e.scheduledToday);

  // 90-day aggregate heatmap
  const heatmapData: {
    date: Date;
    total: number;
    done: number;
    ratio: number;
  }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = subDays(today, i);
    const k = dayKey(d);
    let total = 0;
    let done = 0;
    for (const id of taskIds) {
      const occs = occurrences90[id] ?? [];
      const occ = occs.find((o) => dayKey(new Date(o.date)) === k);
      if (occ) {
        total++;
        if (occ.completed) done++;
      }
    }
    heatmapData.push({
      date: d,
      total,
      done,
      ratio: total === 0 ? 0 : done / total,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
            <span className="text-primary">●</span>
            <span className="ml-2">Habits</span>
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Daily rituals</h1>
          <p className="priv mt-2 text-sm text-muted-foreground">
            {habits.length === 0
              ? "No habits yet."
              : `${habits.length} active · ${todayHabits.length} scheduled today`}
          </p>
        </div>
      </header>

      <div className="mb-8">
        <QuickAddHabit />
      </div>

      {/* Weekly routine */}
      {habits.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <span
              className="size-1 rounded-full bg-primary"
              style={{ boxShadow: "0 0 6px oklch(0.66 0.22 285)" }}
            />
            Weekly routine
          </h2>
          <WeeklyRoutine habits={habits} weekdaysByHabit={weekdaysByHabit} />
        </section>
      )}

      {/* Today */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <span className="size-1 rounded-full bg-muted-foreground/60" />
          Today
        </h2>
        {todayHabits.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing scheduled today.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {todayHabits.map((h) => (
              <TodayTile
                key={h.task._id}
                task={h.task}
                completed={h.doneToday}
                currentStreak={h.streaks.current}
              />
            ))}
          </div>
        )}
      </section>

      {/* All habits */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <span className="size-1 rounded-full bg-muted-foreground/60" />
          All habits
        </h2>
        {sortedAll.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Add your first habit above.
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAll.map((h) => (
              <HabitRow
                key={h.task._id}
                task={h.task}
                days={h.days30}
                weekdays={h.weekdays}
                current={h.streaks.current}
                longest={h.streaks.longest}
                goalTitle={h.goalTitle}
              />
            ))}
          </div>
        )}
      </section>

      {/* 90-day heatmap */}
      {habits.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <span className="size-1 rounded-full bg-muted-foreground/60" />
            Last 90 days
          </h2>
          <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card/30 p-5">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <HabitHeatmap data={heatmapData} />
          </div>
        </section>
      )}
    </div>
  );
}
