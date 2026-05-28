import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function StreakChip({
  value,
  label,
  accent = false,
}: {
  value: number;
  label?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5",
        accent
          ? "border-[oklch(0.78_0.16_78)]/30 bg-[oklch(0.78_0.16_78)]/10"
          : "border-border/60 bg-muted/30"
      )}
    >
      {accent && <Flame className="size-3 text-[oklch(0.78_0.16_78)]" />}
      <span
        data-numeric
        className={cn(
          "priv font-mono text-[11px] tabular-nums leading-none",
          accent ? "text-[oklch(0.85_0.16_78)]" : "text-foreground/90"
        )}
      >
        {value}
      </span>
      {label && (
        <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">
          {label}
        </span>
      )}
    </div>
  );
}
