import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { format } from "date-fns";
import type { Meeting } from "@/lib/schemas";
import { stripHtml } from "@/components/editor/plain-text";

export function MeetingRow({
  meeting,
  actionItemCount,
}: {
  meeting: Meeting;
  actionItemCount: number;
}) {
  const snippet = stripHtml(meeting.body)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  return (
    <Link
      href={`/library/meetings/${meeting._id}`}
      className="group flex items-start gap-3 rounded-xl border border-border/30 bg-card/40 p-3 transition-colors hover:bg-card/60"
    >
      <div className="priv shrink-0 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {format(meeting.meeting_date, "MMM d, yyyy")}
      </div>
      <div className="min-w-0 flex-1">
        <p className="priv truncate text-sm font-medium">{meeting.title}</p>
        {snippet && (
          <p className="priv mt-0.5 truncate text-[12px] text-muted-foreground">
            {snippet}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground">
        {actionItemCount > 0 && (
          <span className="priv inline-flex items-center gap-1">
            <ListChecks className="size-3" />
            {actionItemCount}
          </span>
        )}
        <ChevronRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}
