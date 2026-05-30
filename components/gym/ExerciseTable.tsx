import { Play } from "lucide-react";
import { WeightCell } from "./WeightCell";
import type { Exercise } from "@/lib/gym-plan";
import type { ExerciseWeight } from "@/lib/schemas";

export function ExerciseTable({
  exercises,
  weights,
}: {
  exercises: Exercise[];
  weights: Record<string, ExerciseWeight>;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card/30">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <table className="w-full text-left">
        <thead className="border-b border-border/30">
          <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <th className="px-3 py-3 font-medium">Exercise</th>
            <th className="px-3 py-3 font-medium w-32">Equipment</th>
            <th className="px-3 py-3 font-medium w-24">Sets × Reps</th>
            <th className="px-3 py-3 font-medium w-28">Weight</th>
            <th className="px-3 py-3 font-medium w-20">Rest</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((ex) => {
            const w = weights[ex.key];
            return (
              <tr
                key={ex.key}
                className="border-b border-border/20 align-top transition-colors hover:bg-card/30"
              >
                <td className="px-3 py-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {ex.name}
                        </span>
                        <a
                          href={ex.video}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Watch form video"
                          className="inline-flex items-center gap-0.5 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/20"
                        >
                          <Play className="size-2.5" />
                          form
                        </a>
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                        {ex.form}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-[11px] text-muted-foreground">
                  {ex.equipment}
                </td>
                <td className="px-3 py-3 font-mono text-[12px] tabular-nums text-foreground/90">
                  {ex.prescription}
                </td>
                <td className="px-3 py-3">
                  <WeightCell
                    exerciseKey={ex.key}
                    weight={w?.weight ?? null}
                    unit={w?.unit ?? "kg"}
                  />
                </td>
                <td className="px-3 py-3 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {ex.rest}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
