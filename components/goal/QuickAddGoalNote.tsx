"use client";

import { useState, useTransition } from "react";
import { Link2, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGoalNoteAction } from "@/app/actions/goal-notes";
import type { GoalNoteKind, Task } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/editor/RichEditor";
import { stripHtml } from "@/components/editor/plain-text";

export function QuickAddGoalNote({
  goalId,
  tasks,
}: {
  goalId: string;
  tasks: Task[];
}) {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<GoalNoteKind>("personal");
  const [linking, setLinking] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const flatTasks = flattenTasks(tasks);

  const hasContent = stripHtml(body).length > 0;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!hasContent) return;
    startTransition(async () => {
      await createGoalNoteAction({
        goal_id: goalId,
        task_id: linking ? taskId : null,
        kind,
        body,
      });
      setBody("");
      // Keep kind + linking state so consecutive captures stay fast.
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-2"
    >
      <RichEditor
        value={body}
        onChange={setBody}
        placeholder="Capture a note…"
        disabled={pending}
        compact
      />
      <div className="flex flex-wrap items-center gap-2">
        <KindToggle value={kind} onChange={setKind} disabled={pending} />

        {linking ? (
          <div className="flex items-center gap-1">
            <Select
              value={taskId ?? "__none__"}
              onValueChange={(v) => setTaskId(v === "__none__" ? null : v)}
              disabled={pending}
            >
              <SelectTrigger
                size="sm"
                className="!h-6 gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0 text-[10px] uppercase tracking-[0.14em] text-primary"
              >
                <Link2 className="size-2.5" />
                <SelectValue placeholder="Pick a task…" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="min-w-[260px]">
                <SelectItem value="__none__" className="text-[11px] text-muted-foreground">
                  (no specific task)
                </SelectItem>
                {flatTasks.map((t) => (
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
            <button
              type="button"
              onClick={() => {
                setLinking(false);
                setTaskId(null);
              }}
              disabled={pending}
              title="Remove link"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLinking(true)}
            disabled={pending || flatTasks.length === 0}
            title={flatTasks.length === 0 ? "No tasks to link" : "Link to a task"}
            className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-card/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
          >
            <Link2 className="size-2.5" />
            Link task
          </button>
        )}

        <button
          type="submit"
          disabled={pending || !hasContent}
          className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Plus className="size-3" />
          Add note
        </button>
      </div>
    </form>
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

type FlatTask = { _id: string; title: string; depth: number };

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
