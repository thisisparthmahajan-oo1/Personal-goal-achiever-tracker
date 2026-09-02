"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import {
  createTaskAction,
  setTaskStatusAction,
  setTaskWeightAction,
  deleteTaskAction,
} from "@/app/actions/tasks";
import type { Task, TaskStatus } from "@/lib/schemas";
import type { Occurrence } from "@/lib/repositories/tasks";
import { describeRecurrence } from "@/lib/recurrence";
import { RecurrenceDialog } from "./RecurrenceDialog";
import { OccurrenceStrip } from "./OccurrenceStrip";
import { cn } from "@/lib/utils";

type Node = Task & { children: Node[] };
const MAX_DEPTH = 2; // 0=root, 1=child, 2=grandchild — no deeper

function splitTitleUrl(title: string): { text: string; url: string | null } {
  const m = title.match(/https?:\/\/\S+/i);
  if (!m) return { text: title, url: null };
  const url = m[0].replace(/[),.;]+$/, "");
  let text = title.replace(m[0], "").trim();
  text = text.replace(/[\s]*[—–\-:][\s]*$/, "").trim();
  return { text, url };
}

function urlLabel(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "open";
  }
}

function buildTree(tasks: Task[]): Node[] {
  const byId = new Map<string, Node>();
  for (const t of tasks) byId.set(t._id, { ...t, children: [] });
  const roots: Node[] = [];
  for (const node of byId.values()) {
    if (node.parent_task_id && byId.has(node.parent_task_id)) {
      byId.get(node.parent_task_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: Node[]) => {
    nodes.sort((a, b) => +a.created_at - +b.created_at);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done"];
function nextStatus(s: TaskStatus): TaskStatus {
  return STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length];
}

function siblingWeightSum(
  tasks: Task[],
  parentTaskId: string | null,
  excludeTaskId?: string
): number {
  return tasks
    .filter((t) => {
      if (t.recurrence) return false;
      if (t.parent_task_id !== parentTaskId) return false;
      if (excludeTaskId && t._id === excludeTaskId) return false;
      return true;
    })
    .reduce((s, t) => s + (t.weight ?? 0), 0);
}

function remainingBudget(
  tasks: Task[],
  parentTaskId: string | null,
  excludeTaskId?: string
): number {
  if (parentTaskId === null) {
    return 100 - siblingWeightSum(tasks, null, excludeTaskId);
  }
  const parent = tasks.find((t) => t._id === parentTaskId);
  if (!parent) return 0;
  return parent.weight - siblingWeightSum(tasks, parentTaskId, excludeTaskId);
}

export function TaskTree({
  goalId,
  tasks,
  occurrences,
}: {
  goalId: string;
  tasks: Task[];
  occurrences: Record<string, Occurrence[]>;
}) {
  const tree = buildTree(tasks);
  const rootRemaining = remainingBudget(tasks, null);

  return (
    <div className="space-y-1">
      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <ul className="space-y-0.5">
          {tree.map((node) => (
            <TaskNode
              key={node._id}
              node={node}
              goalId={goalId}
              depth={0}
              allTasks={tasks}
              occurrences={occurrences}
            />
          ))}
        </ul>
      )}
      <div className="pt-3">
        <AddTaskInline
          goalId={goalId}
          parentId={null}
          remaining={rootRemaining}
        />
      </div>
    </div>
  );
}

function TaskNode({
  node,
  goalId,
  depth,
  allTasks,
  occurrences,
}: {
  node: Node;
  goalId: string;
  depth: number;
  allTasks: Task[];
  occurrences: Record<string, Occurrence[]>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const canAddSubtask = depth < MAX_DEPTH && !node.recurrence;
  const childRemaining = node.recurrence ? 0 : node.weight - siblingWeightSum(allTasks, node._id);
  const taskOccurrences = occurrences[node._id];

  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-muted/30"
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        ) : (
          <span className="inline-block size-4" />
        )}

        {!node.recurrence ? (
          <StatusToggle taskId={node._id} status={node.status} goalId={goalId} />
        ) : (
          <span className="flex size-4 items-center justify-center text-primary">
            <RecurringDot />
          </span>
        )}

        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          {(() => {
            const { text, url } = splitTitleUrl(node.title);
            return (
              <>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setTitleExpanded((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setTitleExpanded((v) => !v);
                    }
                  }}
                  title={titleExpanded ? "Click to collapse" : text}
                  className={cn(
                    "priv relative cursor-pointer text-sm",
                    titleExpanded ? "break-words" : "truncate"
                  )}
                >
                  <span
                    className={cn(
                      "transition-colors duration-300",
                      node.status === "done" && "text-muted-foreground"
                    )}
                  >
                    {text}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute left-0 top-1/2 h-px bg-current origin-left transition-transform duration-300 ease-out",
                      node.status === "done" ? "scale-x-100" : "scale-x-0"
                    )}
                    style={{ width: "100%" }}
                  />
                </span>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={url}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 inline-flex items-center gap-0.5 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/20"
                  >
                    <ExternalLink className="size-2.5" />
                    {urlLabel(url)}
                  </a>
                )}
              </>
            );
          })()}
          {node.recurrence ? (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-primary">
              {describeRecurrence(node.recurrence)}
            </span>
          ) : (
            <WeightChip
              task={node}
              goalId={goalId}
              allTasks={allTasks}
              hasChildren={hasChildren}
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          <RecurrenceDialog
            taskId={node._id}
            goalId={goalId}
            current={node.recurrence}
            disabled={node.weight > 0 || hasChildren}
          />
          <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {canAddSubtask && (
              <button
                type="button"
                onClick={() => setAdding((v) => !v)}
                title="Add subtask"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            )}
            <DeleteButton taskId={node._id} goalId={goalId} />
          </div>
        </div>
      </div>

      {node.recurrence && taskOccurrences && taskOccurrences.length > 0 && (
        <div style={{ paddingLeft: depth * 16 + 28 }} className="pb-1">
          <OccurrenceStrip
            taskId={node._id}
            goalId={goalId}
            occurrences={taskOccurrences}
          />
        </div>
      )}

      {adding && (
        <div style={{ paddingLeft: (depth + 1) * 16 + 4 }} className="py-1">
          <AddTaskInline
            goalId={goalId}
            parentId={node._id}
            remaining={childRemaining}
            onDone={() => setAdding(false)}
            autoFocus
          />
        </div>
      )}

      {hasChildren && !collapsed && (
        <ul>
          {node.children.map((c) => (
            <TaskNode
              key={c._id}
              node={c}
              goalId={goalId}
              depth={depth + 1}
              allTasks={allTasks}
              occurrences={occurrences}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function WeightChip({
  task,
  goalId,
  allTasks,
  hasChildren,
}: {
  task: Task;
  goalId: string;
  allTasks: Task[];
  hasChildren: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.weight);
  const [pending, startTransition] = useTransition();

  // Max allowed: existing weight + remaining budget at this task's scope.
  const max = task.weight + remainingBudget(allTasks, task.parent_task_id, task._id);
  // If task has children, its weight is the envelope — we must not shrink below
  // the sum of subtask weights, since that would leave subtasks over-budget.
  const childrenSum = hasChildren ? siblingWeightSum(allTasks, task._id) : 0;
  const min = childrenSum;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(task.weight);
          setEditing(true);
        }}
        title={`Weight: ${task.weight}% — click to edit`}
        className="priv shrink-0 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-mono font-medium tabular-nums text-muted-foreground hover:border-primary/40 hover:text-foreground"
        data-numeric
      >
        {task.weight}%
      </button>
    );
  }

  const save = () => {
    const clamped = Math.max(min, Math.min(max, Math.round(value) || 0));
    startTransition(async () => {
      if (clamped !== task.weight) {
        await setTaskWeightAction(task._id, goalId, clamped);
      }
      setEditing(false);
    });
  };

  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <input
        autoFocus
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={save}
        disabled={pending}
        className="w-14 rounded-md border border-primary/40 bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <span className="text-[10px] text-muted-foreground">/ {max}</span>
    </span>
  );
}

function StatusToggle({
  taskId,
  status,
  goalId,
}: {
  taskId: string;
  status: TaskStatus;
  goalId: string;
}) {
  const [pending, startTransition] = useTransition();
  const cycle = () => {
    const next = nextStatus(status);
    startTransition(() => setTaskStatusAction(taskId, next, goalId));
  };
  const styles =
    status === "done"
      ? "bg-primary border-primary text-primary-foreground"
      : status === "doing"
      ? "border-primary bg-primary/15"
      : "border-border";
  return (
    <button
      type="button"
      onClick={cycle}
      disabled={pending}
      title={`Status: ${status} (click to cycle)`}
      className={cn(
        "flex size-4 items-center justify-center rounded-full border transition-all duration-200 active:scale-90 hover:ring-2 hover:ring-primary/30 hover:ring-offset-1 hover:ring-offset-background",
        styles,
        status === "done" && "shadow-[0_0_8px_oklch(0.66_0.22_285/0.5)]",
        pending && "opacity-60"
      )}
    >
      {status === "done" && (
        <svg viewBox="0 0 12 12" className="size-2.5">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {status === "doing" && <span className="size-1.5 rounded-full bg-primary" />}
    </button>
  );
}

function DeleteButton({ taskId, goalId }: { taskId: string; goalId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Delete this task and its subtasks?")) {
          startTransition(() => deleteTaskAction(taskId, goalId));
        }
      }}
      disabled={pending}
      title="Delete"
      className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

function AddTaskInline({
  goalId,
  parentId,
  remaining,
  onDone,
  autoFocus,
}: {
  goalId: string;
  parentId: string | null;
  remaining: number;
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(autoFocus));
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState(Math.max(0, remaining));
  const [pending, startTransition] = useTransition();

  if (!open) {
    if (remaining <= 0) {
      return (
        <p className="text-[11px] text-muted-foreground/70 italic">
          {parentId
            ? "Parent budget filled — reduce a subtask weight (click its % pill) to add another."
            : "100% allocated — reduce a task weight (click its % pill) to add another."}
        </p>
      );
    }
    return (
      <button
        type="button"
        onClick={() => {
          setWeight(remaining);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-3" />
        Add task <span className="opacity-60">· {remaining} left</span>
      </button>
    );
  }

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    const w = Math.max(0, Math.min(remaining, Math.round(weight) || 0));
    startTransition(async () => {
      await createTaskAction({
        goal_id: goalId,
        title: t,
        weight: w,
        parent_task_id: parentId,
      });
      setTitle("");
      setWeight(0);
      setOpen(false);
      onDone?.();
    });
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
            onDone?.();
          }
        }}
        placeholder={parentId ? "Subtask title" : "Task title"}
        disabled={pending}
        className="flex-1 rounded-md border border-input bg-background/50 px-2 py-1 text-sm outline-none focus:border-primary"
      />
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={remaining}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          disabled={pending}
          className="w-14 rounded-md border border-input bg-background/50 px-1.5 py-1 text-sm font-mono text-center tabular-nums focus:border-primary focus:outline-none"
          title="Weight"
        />
        <span className="text-[10px] text-muted-foreground">/ {remaining}</span>
      </div>
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

function RecurringDot() {
  return (
    <svg viewBox="0 0 8 8" className="size-2.5">
      <circle cx="4" cy="4" r="3" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
