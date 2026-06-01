import { startOfDay, subDays, isToday, isYesterday, format } from "date-fns";
import { listOpen, listCompletedBetween } from "@/lib/repositories/todos";
import { QuickAddTodo } from "@/components/todos/QuickAddTodo";
import { TodoRow } from "@/components/todos/TodoRow";
import type { Todo } from "@/lib/schemas";

export const dynamic = "force-dynamic";

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

function groupByDay(todos: Todo[]): { date: Date; items: Todo[] }[] {
  const groups = new Map<string, { date: Date; items: Todo[] }>();
  for (const t of todos) {
    if (!t.completed_at) continue;
    const day = startOfDay(t.completed_at);
    const key = format(day, "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, { date: day, items: [] });
    groups.get(key)!.items.push(t);
  }
  return [...groups.values()].sort((a, b) => +b.date - +a.date);
}

export default async function TodosPage() {
  const now = new Date();
  const today = startOfDay(now);
  const windowStart = subDays(today, 6); // includes today → 7 days total
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 1); // exclusive upper bound

  const [openTodos, recentDone] = await Promise.all([
    listOpen(),
    listCompletedBetween(windowStart, windowEnd),
  ]);

  const doneByDay = groupByDay(recentDone);
  const doneToday = doneByDay.find((g) => isToday(g.date))?.items.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          <span className="text-primary">●</span>
          <span className="ml-2">Daily TODOs</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Today's list</h1>
        <p className="priv mt-2 text-sm text-muted-foreground">
          {openTodos.length === 0
            ? "Nothing open."
            : `${openTodos.length} open · ${doneToday} done today`}
        </p>
      </header>

      <div className="mb-8">
        <QuickAddTodo />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <span
            className="size-1 rounded-full bg-primary"
            style={{ boxShadow: "0 0 6px oklch(0.66 0.22 285)" }}
          />
          Open
        </h2>
        {openTodos.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
            No open todos.
          </div>
        ) : (
          <div className="space-y-2">
            {openTodos.map((t) => (
              <TodoRow key={t._id} todo={t} />
            ))}
          </div>
        )}
      </section>

      {doneByDay.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <span className="size-1 rounded-full bg-muted-foreground/60" />
            Completed · last 7 days
          </h2>
          <div className="space-y-5 opacity-80">
            {doneByDay.map((group) => (
              <div key={group.date.toISOString()}>
                <h3 className="priv mb-2 flex items-baseline gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  {dayLabel(group.date)}
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                    · {group.items.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {group.items.map((t) => (
                    <TodoRow key={t._id} todo={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
