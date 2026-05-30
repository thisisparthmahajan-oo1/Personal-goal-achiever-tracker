"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTodoAction } from "@/app/actions/todos";

export function QuickAddTodo() {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      await createTodoAction({ title: t });
      setTitle("");
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2"
    >
      <Plus className="size-4 text-muted-foreground shrink-0" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setTitle("");
        }}
        placeholder="Add a TODO…"
        disabled={pending}
        className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
