import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Trash2, ExternalLink, NotebookText } from "lucide-react";
import { formatDistanceToNowStrict, format, subDays, startOfDay } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { TaskTree } from "@/components/goal/TaskTree";
import { TrendChart } from "@/components/goal/TrendChart";
import { InstrumentReadout } from "@/components/instrument/InstrumentReadout";
import { PrivacyScope } from "@/components/privacy/PrivacyScope";
import { PrivacyEye } from "@/components/privacy/PrivacyEye";
import { get as getGoal, getProgressHistory } from "@/lib/repositories/goals";
import {
  list as listTasks,
  getOccurrencesForGoal,
  computeGoalProgress,
  type ProgressPoint,
} from "@/lib/repositories/tasks";
import {
  listRecentForGoal as listRecentNotes,
  countForGoal as countGoalNotes,
} from "@/lib/repositories/goal-notes";
import { listForGoal as listGoalResources } from "@/lib/repositories/goal-resources";
import { QuickAddGoalNote } from "@/components/goal/QuickAddGoalNote";
import { GoalNotesPreview } from "@/components/goal/GoalNotesPreview";
import { GoalResources } from "@/components/goal/GoalResources";
import { deleteGoalAction } from "@/app/actions/goals";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-primary/15 text-primary border-primary/30",
  completed:
    "bg-[oklch(0.74_0.14_175)]/15 text-[oklch(0.85_0.14_175)] border-[oklch(0.74_0.14_175)]/30",
  archived: "bg-muted/40 text-muted-foreground border-border",
};

function parseSourceUrl(source: string): { href: string; label: string } | null {
  const trimmed = source.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    const label = u.host.replace(/^www\./, "");
    return { href: u.toString(), label };
  } catch {
    return null;
  }
}

function deltaInLastDays(
  history: ProgressPoint[],
  currentPct: number,
  days: number
): number {
  const cutoff = Date.now() - days * 86_400_000;
  const past = [...history].reverse().find((p) => +p.date <= cutoff);
  return currentPct - (past?.pct ?? 0);
}

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const today = startOfDay(new Date());
  const rangeStart = subDays(today, 6);
  const [goal, tasks, occurrences, history, recentNotes, notesCount, resources] =
    await Promise.all([
      getGoal(id),
      listTasks({ goal_id: id }),
      getOccurrencesForGoal(id, rangeStart, today),
      getProgressHistory(id),
      listRecentNotes(id, 3),
      countGoalNotes(id),
      listGoalResources(id),
    ]);
  if (!goal) notFound();

  const { progress_pct, planned_pct } = computeGoalProgress(tasks);
  const unallocated = Math.max(0, 100 - planned_pct);
  const inflight = Math.max(0, planned_pct - progress_pct);
  const weekDelta = Math.round(deltaInLastDays(history, progress_pct, 7));

  const deleteThis = deleteGoalAction.bind(null, goal._id);

  return (
    <PrivacyScope id={goal._id} className="mx-auto max-w-6xl px-8 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Dashboard
      </Link>

      <header className="mt-6 mb-10 flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${
                STATUS_STYLE[goal.status]
              }`}
            >
              {goal.status}
            </span>
            {goal.source && (() => {
              const url = parseSourceUrl(goal.source);
              if (url) {
                return (
                  <a
                    href={url.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={url.href}
                    className="priv inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/20"
                  >
                    <ExternalLink className="size-2.5" />
                    {url.label}
                  </a>
                );
              }
              return (
                <span className="priv rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {goal.source}
                </span>
              );
            })()}
          </div>
          <h1 className="priv text-4xl font-semibold tracking-tight">{goal.title}</h1>
          {goal.description && (
            <p className="priv mt-3 text-base text-muted-foreground max-w-2xl">
              {goal.description}
            </p>
          )}
          {goal.target_date && (
            <p className="mt-4 text-sm">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Target
              </span>
              <span className="priv ml-2 font-mono" data-numeric>
                {format(goal.target_date, "MMM d, yyyy")}
              </span>
              <span className="priv ml-1.5 text-muted-foreground">
                · {formatDistanceToNowStrict(goal.target_date, { addSuffix: true })}
              </span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <PrivacyEye id={goal._id} />
          <Link
            href={`/goals/${goal._id}/notes`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <NotebookText className="size-4" />
            Notes
            {notesCount > 0 && (
              <span className="priv ml-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                {notesCount}
              </span>
            )}
          </Link>
          <Link
            href={`/goals/${goal._id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
          <form action={deleteThis}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel>
          <PanelTitle>Tasks</PanelTitle>
          <TaskTree goalId={goal._id} tasks={tasks} occurrences={occurrences} />
        </Panel>

        <Panel>
          <InstrumentReadout
            label="Progress / 100"
            value={progress_pct}
            denominator={100}
            delta={weekDelta}
            size="xl"
          />

          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{
                width: `${progress_pct}%`,
                boxShadow:
                  "0 0 16px oklch(0.66 0.22 285 / 0.55), inset 0 0 10px oklch(1 0 0 / 0.18)",
              }}
            />
            {inflight > 0 && (
              <div
                className="absolute inset-y-0 rounded-r-full"
                style={{
                  left: `${progress_pct}%`,
                  width: `${inflight}%`,
                  background:
                    "linear-gradient(90deg, oklch(0.66 0.22 285 / 0.25), oklch(0.66 0.22 285 / 0.5), oklch(0.66 0.22 285 / 0.25))",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2.4s linear infinite",
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground/60">Planned</span>
              <span data-numeric className="priv font-mono tabular-nums text-foreground/90">
                {planned_pct}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground/60">In flight</span>
              <span data-numeric className="priv font-mono tabular-nums text-foreground/90">
                {inflight}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground/60">Unallocated</span>
              <span
                data-numeric
                className={`priv font-mono tabular-nums ${
                  unallocated > 0 ? "text-[oklch(0.78_0.16_78)]" : "text-foreground/40"
                }`}
              >
                {unallocated}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground/60">7d Δ</span>
              <span
                data-numeric
                className={`priv font-mono tabular-nums ${
                  weekDelta > 0
                    ? "text-[oklch(0.74_0.14_175)]"
                    : "text-foreground/60"
                }`}
              >
                {weekDelta > 0 ? "+" : ""}
                {weekDelta}%
              </span>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Trend
            </h3>
            <div className="priv">
              <TrendChart points={history} />
            </div>
          </div>
        </Panel>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <span
            className="size-1 rounded-full bg-primary"
            style={{ boxShadow: "0 0 6px oklch(0.66 0.22 285)" }}
          />
          Resources
        </h2>
        <GoalResources goalId={goal._id} resources={resources} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <span
            className="size-1 rounded-full bg-primary"
            style={{ boxShadow: "0 0 6px oklch(0.66 0.22 285)" }}
          />
          Notes
        </h2>
        <div className="space-y-3">
          <QuickAddGoalNote goalId={goal._id} tasks={tasks} />
          <GoalNotesPreview
            goalId={goal._id}
            notes={recentNotes}
            totalCount={notesCount}
            tasks={tasks}
          />
        </div>
      </section>
    </PrivacyScope>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur-xl"
      style={{ boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.04)" }}>
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute top-2.5 left-2.5 size-3 border-l border-t border-primary/20" />
      <span aria-hidden className="pointer-events-none absolute top-2.5 right-2.5 size-3 border-r border-t border-primary/20" />
      <span aria-hidden className="pointer-events-none absolute bottom-2.5 left-2.5 size-3 border-l border-b border-primary/20" />
      <span aria-hidden className="pointer-events-none absolute bottom-2.5 right-2.5 size-3 border-r border-b border-primary/20" />
      <div className="relative space-y-6">{children}</div>
    </section>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
      <span className="size-1 rounded-full bg-primary" style={{ boxShadow: "0 0 6px oklch(0.66 0.22 285)" }} />
      {children}
    </h2>
  );
}
