"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Check, Trash2 } from "lucide-react";
import {
  toggleTodoAction,
  renameTodoAction,
  deleteTodoAction,
} from "@/app/actions/todos";
import type { Todo } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function TodoRow({ todo }: { todo: Todo }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const done = todo.completed_at !== null;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== todo.title) {
      startTransition(() => renameTodoAction(todo._id, next));
    } else {
      setDraft(todo.title);
    }
    setEditing(false);
  };

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border/30 bg-card/40 px-3 py-2 transition-colors hover:bg-card/60">
      <button
        type="button"
        onClick={() => startTransition(() => toggleTodoAction(todo._id))}
        disabled={pending}
        title={done ? "Mark open" : "Mark done"}
        className={cn(
          "shrink-0 flex size-5 items-center justify-center rounded-md border transition-colors",
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/60 hover:border-primary/60"
        )}
      >
        {done && <Check className="size-3.5" strokeWidth={3} />}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(todo.title);
              setEditing(false);
            }
          }}
          className="priv flex-1 min-w-0 bg-transparent text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          className={cn(
            "priv flex-1 min-w-0 truncate text-left text-sm",
            done && "text-muted-foreground line-through decoration-muted-foreground/60"
          )}
          title="Double-click to rename"
        >
          {todo.title}
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          if (confirm("Delete this TODO?"))
            startTransition(() => deleteTodoAction(todo._id));
        }}
        disabled={pending}
        title="Delete"
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
