import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";

type Size = "md" | "lg" | "xl";
const SIZE_CLASS: Record<Size, string> = {
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

export function InstrumentReadout({
  label,
  value,
  denominator,
  delta,
  size = "lg",
  align = "left",
  unit,
  className,
}: {
  label: string;
  value: number;
  denominator?: number;
  delta?: number;
  size?: Size;
  align?: "left" | "right";
  unit?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", align === "right" && "text-right", className)}>
      <div className={cn("flex items-baseline gap-2", align === "right" && "justify-end")}>
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
          {denominator !== undefined && (
            <span className="text-muted-foreground/50"> / {denominator}</span>
          )}
        </span>
        {typeof delta === "number" && delta !== 0 && (
          <span
            className={cn(
              "font-mono text-[10px] tabular-nums",
              delta > 0 ? "text-[oklch(0.74_0.14_175)]" : "text-muted-foreground/70"
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
      <div className={cn("flex items-baseline gap-1", align === "right" && "justify-end")}>
        <span
          data-numeric
          className={cn(
            "priv font-mono tabular-nums leading-none text-foreground",
            SIZE_CLASS[size]
          )}
          style={{ textShadow: "0 0 24px oklch(0.66 0.22 285 / 0.25)" }}
        >
          <CountUp value={value} />
        </span>
        {unit && (
          <span className="font-mono text-base text-muted-foreground/60">{unit}</span>
        )}
        {denominator !== undefined && !unit && (
          <span className="font-mono text-base text-muted-foreground/50">/{denominator}</span>
        )}
      </div>
      <div
        className={cn(
          "h-px w-12 bg-gradient-to-r from-primary/70 via-primary/40 to-transparent",
          align === "right" && "ml-auto bg-gradient-to-l"
        )}
      />
    </div>
  );
}
