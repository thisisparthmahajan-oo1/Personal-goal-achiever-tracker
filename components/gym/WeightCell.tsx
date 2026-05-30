"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setExerciseWeightAction } from "@/app/actions/gym";
import type { WeightUnit } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function WeightCell({
  exerciseKey,
  weight,
  unit,
}: {
  exerciseKey: string;
  weight: number | null;
  unit: WeightUnit;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draftUnit, setDraftUnit] = useState<WeightUnit>(unit);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = (val: string) => {
    const num = val.trim() === "" ? null : Number(val);
    const next = Number.isFinite(num as number) ? (num as number) : null;
    startTransition(async () => {
      await setExerciseWeightAction({
        exercise_key: exerciseKey,
        weight: next,
        unit: draftUnit,
      });
      setEditing(false);
    });
  };

  if (editing) {
    const initial = weight === null ? "" : String(weight);
    return (
      <div className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          step="0.5"
          min={0}
          defaultValue={initial}
          disabled={pending}
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-16 rounded-md border border-primary/40 bg-background/60 px-1.5 py-0.5 text-right font-mono text-[12px] tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
        />
        <select
          value={draftUnit}
          onChange={(e) => setDraftUnit(e.target.value as WeightUnit)}
          disabled={pending}
          className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] outline-none"
        >
          <option value="kg">kg</option>
          <option value="lb">lb</option>
        </select>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit weight"
      className={cn(
        "priv inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 text-right font-mono text-[12px] tabular-nums text-foreground/90 transition-colors hover:border-border/60 hover:bg-muted/30"
      )}
    >
      {weight === null ? (
        <span className="text-muted-foreground/50">—</span>
      ) : (
        <>
          <span data-numeric>{weight}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {unit}
          </span>
        </>
      )}
    </button>
  );
}
