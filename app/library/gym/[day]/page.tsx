import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Flame, Dumbbell, Wind } from "lucide-react";
import { MovementList } from "@/components/gym/MovementList";
import { ExerciseTable } from "@/components/gym/ExerciseTable";
import { getDayBySlug, GYM_PLAN } from "@/lib/gym-plan";
import { getMap as getWeightMap } from "@/lib/repositories/exercise-weights";

export const dynamic = "force-dynamic";

export default async function GymDayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day: slug } = await params;
  const day = getDayBySlug(slug);
  if (!day) notFound();

  const weights = await getWeightMap();
  const otherDays = GYM_PLAN.filter((d) => d.slug !== day.slug);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/library/gym"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Gym
      </Link>

      <header className="mt-6 mb-10">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          <span className="text-primary">●</span>
          <span className="ml-2">Library / Gym / Day {day.number}</span>
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Day {day.number} — {day.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
          {day.subtitle}
        </p>
      </header>

      <div className="space-y-10">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <Flame className="size-3.5 text-[oklch(0.78_0.16_78)]" />
            Warm-up · 5–8 min
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground/70">
            Use your low-anchor bands here. Keep tension light — the goal is
            blood flow, not fatigue.
          </p>
          <MovementList items={day.warmup} />
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <Dumbbell className="size-3.5 text-primary" />
            Main workout · 6 exercises
          </h2>
          <ExerciseTable exercises={day.main} weights={weights} />
          <p className="mt-3 text-[11px] text-muted-foreground/60">
            Tip: click any weight to edit. Use the 2-rep rule — when you can do
            2+ reps beyond the top of the range with good form on every set,
            bump the weight.
          </p>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <Wind className="size-3.5 text-[oklch(0.74_0.14_175)]" />
            Cool-down · 5–8 min
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground/70">
            Hold each stretch 20–30 sec, breathe slowly, never bounce. Use the
            low-anchor band for assistance where helpful.
          </p>
          <MovementList items={day.cooldown} />
        </section>
      </div>

      <nav className="mt-12 flex flex-wrap gap-2 border-t border-border/30 pt-6">
        <p className="w-full mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Other days
        </p>
        {otherDays.map((d) => (
          <Link
            key={d.slug}
            href={`/library/gym/${d.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
              Day {d.number}
            </span>
            <span>{d.title}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
