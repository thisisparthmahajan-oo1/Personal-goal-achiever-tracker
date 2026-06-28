"use client";

import { useTransition } from "react";
import { cycleTripItemStatusAction } from "@/app/actions/trips";
import type { TripItemStatus } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const LABELS: Record<TripItemStatus, string> = {
  yet_to_start: "Yet to Start",
  in_review: "In Review",
  completed: "Completed",
};

const STYLES: Record<TripItemStatus, string> = {
  yet_to_start:
    "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50",
  in_review:
    "border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
  completed:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
};

export function TripStatusPill({
  itemId,
  status,
}: {
  itemId: string;
  status: TripItemStatus;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => cycleTripItemStatusAction(itemId))}
      disabled={pending}
      title={`Status: ${LABELS[status]} (click to cycle)`}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
        STYLES[status],
        pending && "opacity-60"
      )}
    >
      {LABELS[status]}
    </button>
  );
}
