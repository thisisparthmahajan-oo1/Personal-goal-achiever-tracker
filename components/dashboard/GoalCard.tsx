"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronRight, Eye, EyeOff } from "lucide-react";
import { ProgressSparkline } from "./ProgressSparkline";
import { InstrumentReadout } from "@/components/instrument/InstrumentReadout";
import { usePrivacy } from "@/components/privacy/PrivacyProvider";
import type { GoalSummary } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-primary/15 text-primary border-primary/30",
  completed:
    "bg-[oklch(0.74_0.14_175)]/15 text-[oklch(0.85_0.14_175)] border-[oklch(0.74_0.14_175)]/30",
  archived: "bg-muted/40 text-muted-foreground border-border",
};

export function GoalCard({ goal }: { goal: GoalSummary }) {
  const { isHidden, toggleCard } = usePrivacy();
  const hidden = isHidden(goal._id);

  const progress = Math.max(0, Math.min(100, goal.progress_pct));
  const planned = Math.max(0, Math.min(100, goal.planned_pct));
  const inflight = Math.max(0, planned - progress);
  const unallocated = Math.max(0, 100 - planned);

  return (
    <div
      data-privacy={hidden ? "hidden" : "visible"}
      className="group relative isolate overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:bg-card/80"
      style={{ boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.05)" }}
    >
      {/* Neon top rule + hover sweep — decorative, never capture clicks */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-30 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <span className="pointer-events-none absolute inset-0 z-30 -translate-x-full bg-gradient-to-r from-transparent via-primary/[0.08] to-transparent transition-transform duration-[1200ms] ease-out group-hover:translate-x-full" />

      {/* Navigation overlay — a real Link covering the whole card (z-0). */}
      <Link
        href={`/goals/${goal._id}`}
        aria-label={goal.title}
        className="absolute inset-0 z-0 rounded-2xl"
      />

      {/* Eye + status — own layer ABOVE the link (z-20). The eye is not inside
          the link or any clickable element, so it can never navigate. */}
      <div className="pointer-events-none absolute right-5 top-5 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleCard(goal._id)}
          title={hidden ? "Reveal this goal" : "Hide this goal"}
          className="pointer-events-auto flex size-7 items-center justify-center rounded-md border border-border/60 bg-background/70 text-muted-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
            STATUS_STYLE[goal.status] ?? STATUS_STYLE.active
          )}
        >
          {goal.status}
        </span>
      </div>

      {/* Content — non-interactive so clicks fall through to the Link overlay. */}
      <div className="pointer-events-none relative z-10 flex flex-col gap-5">
        <div className="pr-28">
          <h3 className="priv text-lg font-semibold tracking-tight truncate">
            {goal.title}
          </h3>
          {goal.description && (
            <p className="priv mt-1 text-sm text-muted-foreground line-clamp-2">
              {goal.description}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <InstrumentReadout
            label="progress"
            value={progress}
            denominator={100}
            size="lg"
          />
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{
                width: `${progress}%`,
                boxShadow:
                  "0 0 14px oklch(0.66 0.22 285 / 0.55), inset 0 0 8px oklch(1 0 0 / 0.15)",
              }}
            />
            {inflight > 0 && (
              <div
                className="absolute inset-y-0 rounded-r-full"
                style={{
                  left: `${progress}%`,
                  width: `${inflight}%`,
                  background:
                    "linear-gradient(90deg, oklch(0.66 0.22 285 / 0.25), oklch(0.66 0.22 285 / 0.45), oklch(0.66 0.22 285 / 0.25))",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2.4s linear infinite",
                }}
              />
            )}
          </div>
          {unallocated > 0 && (
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <span data-numeric className="priv font-mono tabular-nums">
                {unallocated}%
              </span>
              <span className="ml-1.5 text-muted-foreground/60">unallocated</span>
            </p>
          )}
        </div>

        <ProgressSparkline points={goal.recent_progress} />

        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="priv text-muted-foreground">
            {goal.target_date
              ? `Target ${formatDistanceToNowStrict(goal.target_date, { addSuffix: true })}`
              : "No target date"}
          </span>
          <ChevronRight className="size-3.5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </div>
    </div>
  );
}
