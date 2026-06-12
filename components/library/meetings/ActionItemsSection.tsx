"use client";

import { useState, useTransition } from "react";
import { Plus, ListChecks } from "lucide-react";
import { addActionItemAction } from "@/app/actions/meetings";
import { TodoRow } from "@/components/todos/TodoRow";
import type { Todo } from "@/lib/schemas";

export function ActionItemsSection({
  meetingId,
  items,
}: {
  meetingId: string;
  items: Todo[];
}) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      await addActionItemAction({ meeting_id: meetingId, title: t });
      setTitle("");
    });
  };

  const openCount = items.filter((i) => !i.completed_at).length;
  const doneCount = items.length - openCount;

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        <ListChecks className="size-3.5" />
        <span>Action items</span>
        {items.length > 0 && (
          <span className="priv font-mono text-[10px] tabular-nums text-muted-foreground/60">
            · {openCount} open · {doneCount} done
          </span>
        )}
      </header>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((t) => (
            <TodoRow key={t._id} todo={t} />
          ))}
        </div>
      )}

      <form
        onSubmit={submit}
        className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2"
      >
        <Plus className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setTitle("");
          }}
          placeholder="Add an action item — it lands in /todos too"
          disabled={pending}
          maxLength={300}
          className="priv flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Add
        </button>
      </form>
    </section>
  );
}
