import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PrivacyScope } from "@/components/privacy/PrivacyScope";
import { PrivacyEye } from "@/components/privacy/PrivacyEye";
import { QuickAddGoalNote } from "@/components/goal/QuickAddGoalNote";
import { GoalNoteRow } from "@/components/goal/GoalNoteRow";
import { get as getGoal } from "@/lib/repositories/goals";
import { list as listTasks } from "@/lib/repositories/tasks";
import { listForGoal as listNotes } from "@/lib/repositories/goal-notes";
import { GoalNoteKind } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Filter = "all" | "personal" | "office";

function parseFilter(v: string | string[] | undefined): Filter {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === "personal" || s === "office") return s;
  return "all";
}

export default async function GoalNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { id } = await params;
  const { filter: filterRaw } = await searchParams;
  const filter = parseFilter(filterRaw);

  const [goal, tasks, notes] = await Promise.all([
    getGoal(id),
    listTasks({ goal_id: id }),
    listNotes(id, filter === "all" ? undefined : { kind: GoalNoteKind.parse(filter) }),
  ]);
  if (!goal) notFound();

  return (
    <PrivacyScope id={goal._id} className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href={`/goals/${goal._id}`}
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        {goal.title}
      </Link>

      <header className="mt-6 mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
            <span className="text-primary">●</span>
            <span className="ml-2 priv">{goal.title}</span>
            <span className="ml-2">/ Notes</span>
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Notes</h1>
          <p className="priv mt-2 text-sm text-muted-foreground">
            {notes.length === 0
              ? filter === "all"
                ? "No notes yet."
                : `No ${filter} notes.`
              : `${notes.length} note${notes.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <PrivacyEye id={goal._id} />
      </header>

      <div className="mb-6">
        <QuickAddGoalNote goalId={goal._id} tasks={tasks} />
      </div>

      <nav className="mb-6 flex items-center gap-2">
        <FilterTab goalId={goal._id} current={filter} value="all" label="All" />
        <FilterTab goalId={goal._id} current={filter} value="personal" label="Personal" />
        <FilterTab goalId={goal._id} current={filter} value="office" label="Office" />
      </nav>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-10 text-center text-sm text-muted-foreground">
          {filter === "all"
            ? "No notes yet — capture above."
            : `No ${filter} notes yet.`}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <GoalNoteRow key={n._id} note={n} tasks={tasks} />
          ))}
        </div>
      )}
    </PrivacyScope>
  );
}

function FilterTab({
  goalId,
  current,
  value,
  label,
}: {
  goalId: string;
  current: Filter;
  value: Filter;
  label: string;
}) {
  const active = current === value;
  const href =
    value === "all"
      ? `/goals/${goalId}/notes`
      : `/goals/${goalId}/notes?filter=${value}`;
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md border px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition-colors",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
