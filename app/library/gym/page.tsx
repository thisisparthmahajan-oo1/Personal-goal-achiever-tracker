import Link from "next/link";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { GYM_PLAN } from "@/lib/gym-plan";

export const dynamic = "force-dynamic";

export default function GymPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Library
      </Link>

      <header className="mt-6 mb-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          <span className="text-primary">●</span>
          <span className="ml-2">Library / Gym</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">4-day split</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Beginner home plan — dumbbells + bodyweight, with low-anchor band
          warm-ups and assisted cool-downs. Each main exercise has a YouTube
          form demo.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GYM_PLAN.map((d) => (
          <Link
            key={d.slug}
            href={`/library/gym/${d.slug}`}
            className="group relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:bg-card/80"
            style={{ boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.05)" }}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Dumbbell className="size-4" />
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                  Day {d.number}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  {d.title}
                </h2>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {d.subtitle}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <div className="flex gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
              <span>{d.warmup.length} warm-up</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{d.main.length} main</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{d.cooldown.length} cool-down</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
