import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { StaggerFade, FadeInItem } from "@/components/motion/StaggerFade";
import { getDashboardSummary } from "@/lib/repositories/goals";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [goals, archived] = await Promise.all([
    getDashboardSummary(),
    getDashboardSummary({ status: "archived" }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-8 py-10">
      <header className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
            <span className="text-primary">●</span>
            <span className="ml-2">Dashboard / Goals</span>
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Focus areas
          </h1>
          <p className="priv mt-2 text-sm text-muted-foreground">
            {goals.length === 0
              ? "No active goals yet."
              : `${goals.length} active · tracking ${goals.reduce(
                  (s, g) => s + g.planned_pct,
                  0
                )}% of planned weight`}
          </p>
        </div>
        <Link href="/goals/new" className={buttonVariants({ size: "lg" })}>
          <Plus className="size-4" />
          New goal
        </Link>
      </header>

      {goals.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 p-16 text-center backdrop-blur-xl">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <p className="text-muted-foreground max-w-md mx-auto">
            Define a goal here, or let Claude Code create one for you via the
            MCP server during a research session.
          </p>
          <div className="mt-6">
            <Link href="/goals/new" className={buttonVariants()}>
              Create your first goal
            </Link>
          </div>
        </div>
      ) : (
        <StaggerFade>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((g) => (
              <FadeInItem key={g._id}>
                <GoalCard goal={g} />
              </FadeInItem>
            ))}
          </div>
        </StaggerFade>
      )}

      {archived.length > 0 && (
        <details className="group mt-10">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
            <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
            Archived
            <span className="priv font-mono tabular-nums" data-numeric>
              {archived.length}
            </span>
          </summary>
          <div className="mt-5 grid grid-cols-1 gap-5 opacity-60 transition-opacity hover:opacity-100 md:grid-cols-2 xl:grid-cols-3">
            {archived.map((g) => (
              <GoalCard key={g._id} goal={g} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
