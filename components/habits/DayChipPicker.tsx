"use client";

import { cn } from "@/lib/utils";

// Display order is Mon-first; underlying values use JS getDay() (0=Sun..6=Sat).
const LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function DayChipPicker({
  value,
  onChange,
  disabled,
  size = "md",
}: {
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const toggle = (d: number) => {
    const next = value.includes(d)
      ? value.filter((x) => x !== d)
      : [...value, d].sort();
    onChange(next);
  };
  const dim = size === "sm" ? "size-5 text-[9px]" : "size-7 text-[10px]";
  return (
    <div className="flex gap-1">
      {ORDER.map((d, i) => {
        const active = value.includes(d);
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => toggle(d)}
            title={
              [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ][d]
            }
            className={cn(
              "flex items-center justify-center rounded-md font-mono font-medium uppercase tracking-[0.14em] transition-colors",
              dim,
              active
                ? "border border-primary/40 bg-primary/15 text-primary"
                : "border border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {LABELS[i]}
          </button>
        );
      })}
    </div>
  );
}
