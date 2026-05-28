import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { GoalForm } from "@/components/forms/GoalForm";
import { get as getGoal } from "@/lib/repositories/goals";
import { updateGoalAction } from "@/app/actions/goals";

export const dynamic = "force-dynamic";

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) notFound();

  const updateThis = updateGoalAction.bind(null, goal._id);

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <Link
        href={`/goals/${goal._id}`}
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Goal
      </Link>
      <header className="mt-6 mb-10">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          <span className="text-primary">●</span>
          <span className="ml-2">Edit goal</span>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{goal.title}</h1>
      </header>
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-8 backdrop-blur-xl"
        style={{ boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.04)" }}>
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <GoalForm action={updateThis} goal={goal} submitLabel="Save changes" />
      </div>
    </div>
  );
}
