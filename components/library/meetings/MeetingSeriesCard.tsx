import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import type { MeetingSeries } from "@/lib/schemas";

export function MeetingSeriesCard({
  series,
  meetingCount,
  lastMeetingAt,
}: {
  series: MeetingSeries;
  meetingCount: number;
  lastMeetingAt: Date | null;
}) {
  return (
    <Link
      href={`/library/meetings/series/${series._id}`}
      className="group relative isolate flex flex-col gap-3 overflow-hidden rounded-xl border border-border/40 bg-card/60 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-card/80"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <CalendarClock className="size-3.5" />
          </div>
          <h3 className="priv truncate text-base font-semibold tracking-tight">
            {series.title}
          </h3>
          {series.cadence_label && (
            <p className="priv mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {series.cadence_label}
            </p>
          )}
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="priv flex items-baseline justify-between text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70">
        <span>
          {meetingCount} meeting{meetingCount === 1 ? "" : "s"}
        </span>
        {lastMeetingAt && (
          <span>last {formatDistanceToNowStrict(lastMeetingAt, { addSuffix: true })}</span>
        )}
      </div>
    </Link>
  );
}
