"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { EditableDateCell } from "./EditableDateCell";
import { deleteBookAction } from "@/app/actions/books";
import type { BookEntry } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function BookRow({ book }: { book: BookEntry }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr className="group border-b border-border/20 transition-colors hover:bg-card/30">
      <td className="px-3 py-2.5">
        <span className="priv text-sm text-foreground">{book.title}</span>
      </td>
      <td className="px-3 py-2.5">
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
            book.type === "fiction"
              ? "border-[oklch(0.58_0.12_30)]/35 bg-[oklch(0.58_0.12_30)]/12 text-[oklch(0.82_0.12_30)]"
              : "border-[oklch(0.6_0.14_5)]/35 bg-[oklch(0.6_0.14_5)]/12 text-[oklch(0.82_0.14_5)]"
          )}
        >
          {book.type}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap gap-1">
          {book.domains.map((d, i) => (
            <span
              key={i}
              className="priv rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
            >
              {d}
            </span>
          ))}
          {book.domains.length === 0 && (
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/40">
              —
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <StatusPill id={book._id} status={book.status} />
      </td>
      <td className="px-3 py-2.5">
        <EditableDateCell id={book._id} field="start_date" value={book.start_date} />
      </td>
      <td className="px-3 py-2.5">
        <EditableDateCell id={book._id} field="end_date" value={book.end_date} />
      </td>
      <td className="px-2 py-2.5 text-right">
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${book.title}"?`))
              startTransition(() => deleteBookAction(book._id));
          }}
          disabled={pending}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}
