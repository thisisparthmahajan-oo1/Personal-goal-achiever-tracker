import Link from "next/link";
import type { GoalNote, Task } from "@/lib/schemas";
import { GoalNoteRow } from "./GoalNoteRow";

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

  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <GoalNoteRow key={n._id} note={n} tasks={tasks} />
      ))}
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
