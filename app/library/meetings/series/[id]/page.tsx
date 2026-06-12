import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getSeries,
  listMeetings,
} from "@/lib/repositories/meetings";
import { listForMeeting } from "@/lib/repositories/todos";
import { SeriesHeader } from "@/components/library/meetings/SeriesHeader";
import { NewMeetingButton } from "@/components/library/meetings/NewMeetingButton";
import { MeetingRow } from "@/components/library/meetings/MeetingRow";

export const dynamic = "force-dynamic";

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getSeries(id);
  if (!series) notFound();

  const meetings = await listMeetings({ series_id: id });
  const actionCounts = await Promise.all(
    meetings.map((m) =>
      listForMeeting(m._id).then((items) => ({ id: m._id, count: items.length }))
    )
  );
  const countById = new Map(actionCounts.map((c) => [c.id, c.count]));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/library/meetings"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Meetings
      </Link>

      <div className="mt-6 mb-8">
        <SeriesHeader series={series} />
      </div>

      <div className="mb-6 flex items-center justify-between gap-2">
        <p className="priv text-sm text-muted-foreground">
          {meetings.length === 0
            ? "No meetings yet — start your first one."
            : `${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`}
        </p>
        <NewMeetingButton seriesId={series._id} />
      </div>

      {meetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Click &quot;New meeting&quot; to log your first one.
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((m) => (
            <MeetingRow
              key={m._id}
              meeting={m}
              actionItemCount={countById.get(m._id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
