"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Check, Trash2, Pencil, StickyNote, ChevronDown } from "lucide-react";
import {
  toggleTodoAction,
  renameTodoAction,
  setTodoNotesAction,
  deleteTodoAction,
} from "@/app/actions/todos";
import type { Todo } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function TodoRow({ todo }: { todo: Todo }) {
  const [pending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(todo.title);
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(todo.notes ?? "");
  const titleRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const done = todo.completed_at !== null;
  const hasNotes = (todo.notes ?? "").trim().length > 0;

  useEffect(() => {
    setTitleDraft(todo.title);
    setNotesDraft(todo.notes ?? "");
  }, [todo.title, todo.notes]);

  useEffect(() => {
    if (editingTitle) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (expanded && !hasNotes) {
      notesRef.current?.focus();
    }
  }, [expanded, hasNotes]);

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (next && next !== todo.title) {
      startTransition(() => renameTodoAction(todo._id, next));
    } else {
      setTitleDraft(todo.title);
    }
    setEditingTitle(false);
  };

  const commitNotes = () => {
    const next = notesDraft;
    if ((next ?? "") === (todo.notes ?? "")) return;
    startTransition(() => setTodoNotesAction(todo._id, next));
  };

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/30 bg-card/40 transition-colors hover:bg-card/60",
        expanded && "bg-card/60"
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
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

        {editingTitle ? (
          <input
            ref={titleRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitleDraft(todo.title);
                setEditingTitle(false);
              }
            }}
            className="priv flex-1 min-w-0 bg-transparent text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "priv flex-1 min-w-0 truncate text-left text-sm",
              done && "text-muted-foreground line-through decoration-muted-foreground/60"
            )}
            title="Click to show notes"
          >
            {todo.title}
          </button>
        )}

        {hasNotes && !expanded && (
          <StickyNote
            className="size-3.5 shrink-0 text-muted-foreground/60"
            aria-label="Has notes"
          />
        )}

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setTitleDraft(todo.title);
              setEditingTitle(true);
            }}
            disabled={pending}
            title="Edit title"
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Hide notes" : hasNotes ? "Show notes" : "Add notes"}
            className={cn(
              "rounded p-1 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground",
              expanded || hasNotes ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this TODO?"))
                startTransition(() => deleteTodoAction(todo._id));
            }}
            disabled={pending}
            title="Delete"
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/30 px-3 py-2">
          <textarea
            ref={notesRef}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={commitNotes}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setNotesDraft(todo.notes ?? "");
                setExpanded(false);
              }
            }}
            placeholder="Add a note… (saved on blur)"
            rows={3}
            className="priv w-full resize-y rounded-md border border-border/40 bg-background/40 px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50"
          />
        </div>
      )}
    </div>
  );
}
