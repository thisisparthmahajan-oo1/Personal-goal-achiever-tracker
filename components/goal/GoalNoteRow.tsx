"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { NotebookText, Pencil, Trash2, Check, X, Link2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateGoalNoteAction,
  deleteGoalNoteAction,
} from "@/app/actions/goal-notes";
import type { GoalNote, GoalNoteKind, Task } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { KindChip } from "./GoalNoteChips";

type FlatTask = { _id: string; title: string; depth: number };

export function GoalNoteRow({
  note,
  tasks,
}: {
  note: GoalNote;
  tasks: Task[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [kind, setKind] = useState<GoalNoteKind>(note.kind);
  const [taskId, setTaskId] = useState<string | null>(note.task_id);

  const flatTasks = flattenTasks(tasks);
  const titleById = new Map(tasks.map((t) => [t._id, t.title]));
  const taskTitle = note.task_id ? titleById.get(note.task_id) : null;

  const save = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await updateGoalNoteAction(note._id, {
        body: trimmed,
        kind,
        task_id: taskId,
      });
      setEditing(false);
    });
  };

  const cancel = () => {
    setBody(note.body);
    setKind(note.kind);
    setTaskId(note.task_id);
    setEditing(false);
  };

  return (
    <div className="group rounded-xl border border-border/30 bg-card/40 p-4 transition-colors hover:bg-card/60">
      <div className="mb-2 flex items-center gap-2">
        {editing ? (
          <>
            <KindToggle value={kind} onChange={setKind} disabled={pending} />
            <TaskPicker
              value={taskId}
              onChange={setTaskId}
              tasks={flatTasks}
              disabled={pending}
            />
          </>
        ) : (
          <>
            <KindChip kind={note.kind} />
            {taskTitle && (
              <span
                className="priv inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                title={taskTitle}
              >
                <NotebookText className="size-2.5" />
                <span className="max-w-[260px] truncate">{taskTitle}</span>
              </span>
            )}
          </>
        )}

        <span className="priv ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
          {formatDistanceToNowStrict(note.created_at, { addSuffix: true })}
        </span>

        {editing ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={save}
              disabled={pending || !body.trim()}
              title="Save"
              className="rounded p-1 text-primary hover:bg-primary/15 disabled:opacity-40"
            >
              <Check className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              title="Cancel"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              title="Edit"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this note?"))
                  startTransition(() => deleteGoalNoteAction(note._id));
              }}
              disabled={pending}
              title="Delete"
              className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            if (e.key === "Escape") cancel();
          }}
          disabled={pending}
          rows={Math.max(3, body.split("\n").length)}
          className="priv w-full resize-y rounded-md border border-border/40 bg-background/40 px-2 py-1.5 text-sm outline-none focus:border-primary/50"
        />
      ) : (
        <p className="priv whitespace-pre-wrap text-sm text-foreground/90">
          {note.body}
        </p>
      )}
    </div>
  );
}

function KindToggle({
  value,
  onChange,
  disabled,
}: {
  value: GoalNoteKind;
  onChange: (v: GoalNoteKind) => void;
  disabled?: boolean;
}) {
  const base =
    "rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] transition-colors";
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange("personal")}
        disabled={disabled}
        className={cn(
          base,
          value === "personal"
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground"
        )}
      >
        Personal
      </button>
      <button
        type="button"
        onClick={() => onChange("office")}
        disabled={disabled}
        className={cn(
          base,
          value === "office"
            ? "border-[oklch(0.78_0.16_78)]/40 bg-[oklch(0.78_0.16_78)]/15 text-[oklch(0.85_0.14_78)]"
            : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground"
        )}
      >
        Office
      </button>
    </div>
  );
}

function TaskPicker({
  value,
  onChange,
  tasks,
  disabled,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  tasks: FlatTask[];
  disabled?: boolean;
}) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      disabled={disabled || tasks.length === 0}
    >
      <SelectTrigger
        size="sm"
        className="!h-6 gap-1 rounded-md border border-border/40 bg-card/30 px-2 py-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        <Link2 className="size-2.5" />
        <SelectValue placeholder="No task" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-[260px]">
        <SelectItem value="__none__" className="text-[11px] text-muted-foreground">
          (no specific task)
        </SelectItem>
        {tasks.map((t) => (
          <SelectItem
            key={t._id}
            value={t._id}
            className="priv text-[11px]"
          >
            <span style={{ paddingLeft: t.depth * 10 }}>{t.title}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function flattenTasks(tasks: Task[]): FlatTask[] {
  const byParent = new Map<string | null, Task[]>();
  for (const t of tasks) {
    const key = t.parent_task_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(t);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => +a.created_at - +b.created_at);
  }
  const out: FlatTask[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const list = byParent.get(parentId) ?? [];
    for (const t of list) {
      out.push({ _id: t._id, title: t.title, depth });
      walk(t._id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
