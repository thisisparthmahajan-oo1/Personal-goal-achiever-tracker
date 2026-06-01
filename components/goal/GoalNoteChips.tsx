import { cn } from "@/lib/utils";
import type { GoalNoteKind } from "@/lib/schemas";

export function KindChip({
  kind,
  className,
}: {
  kind: GoalNoteKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em]",
        kind === "personal"
          ? "border-primary/35 bg-primary/12 text-primary"
          : "border-[oklch(0.78_0.16_78)]/35 bg-[oklch(0.78_0.16_78)]/12 text-[oklch(0.85_0.14_78)]",
        className
      )}
    >
      {kind}
    </span>
  );
}
