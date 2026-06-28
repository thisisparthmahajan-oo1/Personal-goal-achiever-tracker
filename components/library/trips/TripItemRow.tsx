"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CalendarClock,
  ChevronDown,
  Pencil,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  updateTripItemAction,
  deleteTripItemAction,
} from "@/app/actions/trips";
import type { TripItem } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { TripStatusPill } from "@/components/library/trips/TripStatusPill";
import { TripItemOwnerPill } from "@/components/library/trips/TripItemOwnerPill";
import { RichEditor } from "@/components/editor/RichEditor";
import { stripHtml } from "@/components/editor/plain-text";
import {
  daysUntil,
  formatDateShort,
  toDateInputValue,
} from "@/lib/trip-helpers";

function dueTint(due: Date | null, done: boolean): string {
  if (!due) return "border-dashed border-border/40 text-muted-foreground/70 hover:border-primary/40 hover:text-foreground";
  if (done) return "border-border/30 bg-muted/10 text-muted-foreground/70";
  const d = daysUntil(due);
  if (d === null) return "border-border/40 bg-muted/20 text-muted-foreground";
  if (d < 0) return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  if (d <= 3) return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  return "border-border/40 bg-muted/20 text-muted-foreground";
}

function dueLabel(due: Date | null): string {
  if (!due) return "+ Due";
  const d = daysUntil(due);
  if (d === null) return formatDateShort(due);
  if (d < 0) return `${formatDateShort(due)} · ${-d}d late`;
  if (d === 0) return `${formatDateShort(due)} · today`;
  return `${formatDateShort(due)} · ${d}d`;
}

export function TripItemRow({ item }: { item: TripItem }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dueEditing, setDueEditing] = useState(false);
  const [dueDraft, setDueDraft] = useState(toDateInputValue(item.due_date));
  const dueRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(item.notes ?? "");
  const hasNotes = stripHtml(item.notes ?? "").trim().length > 0;

  useEffect(() => setDraft(item.name), [item.name]);
  useEffect(
    () => setDueDraft(toDateInputValue(item.due_date)),
    [item.due_date]
  );
  useEffect(() => setNotesDraft(item.notes ?? ""), [item.notes]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (dueEditing) dueRef.current?.focus();
  }, [dueEditing]);

  const commit = () => {
    const next = draft.trim();
    if (!next || next === item.name) {
      setDraft(item.name);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await updateTripItemAction(item._id, { name: next });
      setEditing(false);
    });
  };

  const commitDue = () => {
    setDueEditing(false);
    const desired = dueDraft || null;
    const current = toDateInputValue(item.due_date) || null;
    if (desired === current) return;
    startTransition(() =>
      updateTripItemAction(item._id, { due_date: desired })
    );
  };

  const clearDue = () => {
    setDueDraft("");
    setDueEditing(false);
    if (!item.due_date) return;
    startTransition(() => updateTripItemAction(item._id, { due_date: null }));
  };

  const commitNotes = (html: string) => {
    if ((html ?? "") === (item.notes ?? "")) return;
    setNotesDraft(html);
    startTransition(() => updateTripItemAction(item._id, { notes: html }));
  };

  const done = item.status === "completed";

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/30 bg-card/40 transition-colors hover:bg-card/60",
        expanded && "bg-card/60"
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(item.name);
                setEditing(false);
              }
            }}
            disabled={pending}
            maxLength={300}
            className="priv min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "priv min-w-0 flex-1 truncate text-left text-sm",
              done &&
                "text-muted-foreground line-through decoration-muted-foreground/50"
            )}
            title="Click to expand notes"
          >
            {item.name}
          </button>
        )}

        {hasNotes && !expanded && (
          <StickyNote
            className="size-3.5 shrink-0 text-muted-foreground/60"
            aria-label="Has notes"
          />
        )}

        {dueEditing ? (
          <div className="flex shrink-0 items-center gap-1">
            <input
              ref={dueRef}
              type="date"
              value={dueDraft}
              onChange={(e) => setDueDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDue();
                if (e.key === "Escape") {
                  setDueDraft(toDateInputValue(item.due_date));
                  setDueEditing(false);
                }
              }}
              onBlur={commitDue}
              className="priv rounded-md border border-primary/40 bg-card/60 px-2 py-0.5 text-[11px] outline-none"
            />
            {item.due_date && (
              <button
                type="button"
                onClick={clearDue}
                title="Clear due date"
                className="rounded text-[11px] text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDueDraft(toDateInputValue(item.due_date));
              setDueEditing(true);
            }}
            title={item.due_date ? "Edit due date" : "Set due date"}
            className={cn(
              "priv inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors",
              dueTint(item.due_date, done)
            )}
          >
            <CalendarClock className="size-2.5" />
            {dueLabel(item.due_date)}
          </button>
        )}

        <TripItemOwnerPill itemId={item._id} owner={item.owner} />
        <TripStatusPill itemId={item._id} status={item.status} />

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Hide notes" : hasNotes ? "Show notes" : "Add notes"}
            className={cn(
              "rounded p-1 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground",
              expanded || hasNotes
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
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
              setDraft(item.name);
              setEditing(true);
            }}
            disabled={pending}
            title="Edit name"
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${item.name}"?`))
                startTransition(() => deleteTripItemAction(item._id));
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
          <RichEditor
            value={notesDraft}
            onChange={setNotesDraft}
            onBlur={commitNotes}
            placeholder="Notes — context, links, alignment with the rest of us…"
            compact
            autoFocus={!hasNotes}
          />
        </div>
      )}
    </div>
  );
}
