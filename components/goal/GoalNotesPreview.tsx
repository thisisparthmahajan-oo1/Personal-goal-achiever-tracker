import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { NotebookText } from "lucide-react";
import type { GoalNote, Task } from "@/lib/schemas";
import { KindChip } from "./GoalNoteChips";

export function GoalNotesPreview({
  goalId,
  notes,
  totalCount,
  tasks,
}: {
  goalId: string;
  notes: GoalNote[];
  totalCount: number;
  tasks: Task[];
}) {
  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-6 text-center text-sm text-muted-foreground">
        No notes yet — capture above.
      </div>
    );
  }

  const titleById = new Map(tasks.map((t) => [t._id, t.title]));

  return (
    <div className="space-y-2">
      {notes.map((n) => {
        const taskTitle = n.task_id ? titleById.get(n.task_id) : null;
        return (
          <div
            key={n._id}
            className="rounded-xl border border-border/30 bg-card/40 p-3"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <KindChip kind={n.kind} />
              {taskTitle && (
                <span
                  className="priv inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                  title={taskTitle}
                >
                  <NotebookText className="size-2.5" />
                  <span className="max-w-[180px] truncate">{taskTitle}</span>
                </span>
              )}
              <span className="priv ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                {formatDistanceToNowStrict(n.created_at, { addSuffix: true })}
              </span>
            </div>
            <p className="priv whitespace-pre-wrap text-sm text-foreground/90 line-clamp-3">
              {n.body}
            </p>
          </div>
        );
      })}
      {totalCount > notes.length && (
        <Link
          href={`/goals/${goalId}/notes`}
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          View all ({totalCount})
        </Link>
      )}
    </div>
  );
}
