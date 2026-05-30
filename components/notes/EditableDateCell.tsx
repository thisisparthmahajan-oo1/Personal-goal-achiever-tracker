"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { setBookFieldAction } from "@/app/actions/books";

export function EditableDateCell({
  id,
  field,
  value,
}: {
  id: string;
  field: "start_date" | "end_date";
  value: Date | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = (next: string) => {
    startTransition(async () => {
      await setBookFieldAction(id, { [field]: next || null });
      setEditing(false);
    });
  };

  if (editing) {
    const initial = value ? format(value, "yyyy-MM-dd") : "";
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={initial}
        disabled={pending}
        onBlur={(e) => save(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-36 rounded-md border border-primary/40 bg-background/60 px-1.5 py-0.5 font-mono text-[11px] tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit"
      className="priv -mx-1.5 -my-0.5 inline-block rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
      data-numeric
    >
      {value ? format(value, "MMM d, yyyy") : "—"}
    </button>
  );
}
