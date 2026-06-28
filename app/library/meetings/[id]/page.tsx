import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getMeeting, getSeries } from "@/lib/repositories/meetings";
import { listForMeeting } from "@/lib/repositories/todos";
import { MeetingHeader } from "@/components/library/meetings/MeetingHeader";
import { MeetingNotesEditor } from "@/components/library/meetings/MeetingNotesEditor";
import { MeetingSectionsList } from "@/components/library/meetings/MeetingSectionsList";
import { ActionItemsSection } from "@/components/library/meetings/ActionItemsSection";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  const [series, actionItems] = await Promise.all([
    meeting.series_id ? getSeries(meeting.series_id) : Promise.resolve(null),
    listForMeeting(meeting._id),
  ]);

  const backHref = series
    ? `/library/meetings/series/${series._id}`
    : "/library/meetings?tab=adhoc";
  const backLabel = series ? series.title : "Meetings";

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        <span className="priv">{backLabel}</span>
      </Link>

      <div className="mt-6 mb-6">
        <MeetingHeader meeting={meeting} />
      </div>

      <section className="mb-8 space-y-2">
        <h2 className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Notes
        </h2>
        <MeetingNotesEditor meetingId={meeting._id} initialBody={meeting.body} />
      </section>

      <div className="mb-8">
        <MeetingSectionsList
          meetingId={meeting._id}
          sections={meeting.sections}
        />
      </div>

      <ActionItemsSection meetingId={meeting._id} items={actionItems} />
    </div>
  );
}
