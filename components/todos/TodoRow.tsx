"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { Trash2, Pencil, StickyNote, ChevronDown, CalendarClock } from "lucide-react";
import {
  cycleTodoStatusAction,
  renameTodoAction,
  setTodoNotesAction,
  deleteTodoAction,
} from "@/app/actions/todos";
import type { Todo } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/editor/RichEditor";

export function TodoRow({
  todo,
  sourceMeeting,
}: {
  todo: Todo;
  sourceMeeting?: { id: string; title: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(todo.title);
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(todo.notes ?? "");
  const titleRef = useRef<HTMLInputElement>(null);
  const status = todo.status;
  const done = status === "done";
  const doing = status === "doing";
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

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (next && next !== todo.title) {
      startTransition(() => renameTodoAction(todo._id, next));
    } else {
      setTitleDraft(todo.title);
    }
    setEditingTitle(false);
  };

  const commitNotes = (html: string) => {
    const next = html;
    if ((next ?? "") === (todo.notes ?? "")) return;
    setNotesDraft(next);
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
          onClick={() => startTransition(() => cycleTodoStatusAction(todo._id))}
          disabled={pending}
          title={`Status: ${status} (click to cycle)`}
          className={cn(
            "shrink-0 flex size-5 items-center justify-center rounded-full border transition-all duration-200 active:scale-90 hover:ring-2 hover:ring-primary/30 hover:ring-offset-1 hover:ring-offset-background",
            done && "border-primary bg-primary text-primary-foreground shadow-[0_0_8px_oklch(0.66_0.22_285/0.5)]",
            doing && "border-primary bg-primary/15",
            !done && !doing && "border-border/60 hover:border-primary/60",
            pending && "opacity-60"
          )}
        >
          {done && (
            <svg viewBox="0 0 12 12" className="size-3">
              <path
                d="M2.5 6L5 8.5L9.5 3.5"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {doing && <span className="size-1.5 rounded-full bg-primary" />}
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

      {sourceMeeting && (
        <div className="px-3 pb-2 -mt-1">
          <Link
            href={`/library/meetings/${sourceMeeting.id}`}
            title={`From meeting: ${sourceMeeting.title}`}
            className="priv inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/20"
          >
            <CalendarClock className="size-2.5" />
            <span className="max-w-[280px] truncate">{sourceMeeting.title}</span>
          </Link>
        </div>
      )}

      {expanded && (
        <div className="border-t border-border/30 px-3 py-2">
          <RichEditor
            value={notesDraft}
            onChange={setNotesDraft}
            onBlur={commitNotes}
            placeholder="Add a note… (saved on blur)"
            compact
            autoFocus={!hasNotes}
          />
        </div>
      )}
    </div>
  );
}
