import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  listSeries,
  listMeetings,
  countMeetingsInSeries,
} from "@/lib/repositories/meetings";
import { NewSeriesForm } from "@/components/library/meetings/NewSeriesForm";
import { NewMeetingButton } from "@/components/library/meetings/NewMeetingButton";
import { MeetingSeriesCard } from "@/components/library/meetings/MeetingSeriesCard";
import { MeetingRow } from "@/components/library/meetings/MeetingRow";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "recurring" | "adhoc" | "archived";

function parseTab(v: string | string[] | undefined): Tab {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === "adhoc" || s === "archived") return s;
  return "recurring";
}

export default async function MeetingsLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabRaw } = await searchParams;
  const tab = parseTab(tabRaw);

  const [activeSeries, archivedSeries, adhocMeetings] = await Promise.all([
    listSeries({ archived: false }),
    listSeries({ archived: true }),
    listMeetings({ series_id: null, limit: 25 }),
  ]);

  // For the recurring cards, fetch counts in parallel.
  const visibleSeries =
    tab === "archived" ? archivedSeries : activeSeries;
  const counts = await Promise.all(
    visibleSeries.map((s) =>
      countMeetingsInSeries(s._id).then((count) => ({ id: s._id, count }))
    )
  );
  const countById = new Map(counts.map((c) => [c.id, c.count]));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Library
      </Link>

      <header className="mt-6 mb-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          <span className="text-primary">●</span>
          <span className="ml-2">Library / Meetings</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Meetings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recurring 1:1s + ad-hoc reviews. Capture notes per meeting; action
          items become real TODOs in your daily list.
        </p>
      </header>

      <nav className="mb-6 flex items-center gap-2">
        <TabLink current={tab} value="recurring" label="Recurring" />
        <TabLink current={tab} value="adhoc" label="Ad-hoc" />
        <TabLink current={tab} value="archived" label="Archived" />
      </nav>

      {tab === "recurring" && (
        <section className="space-y-4">
          <NewSeriesForm />
          {visibleSeries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No recurring meetings yet. Create one above.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visibleSeries.map((s) => (
                <MeetingSeriesCard
                  key={s._id}
                  series={s}
                  meetingCount={countById.get(s._id) ?? 0}
                  lastMeetingAt={null}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "adhoc" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="priv text-sm text-muted-foreground">
              {adhocMeetings.length === 0
                ? "No ad-hoc meetings yet."
                : `${adhocMeetings.length} ad-hoc meeting${
                    adhocMeetings.length === 1 ? "" : "s"
                  }`}
            </p>
            <NewMeetingButton seriesId={null} label="New ad-hoc meeting" />
          </div>
          {adhocMeetings.length > 0 && (
            <div className="space-y-2">
              {adhocMeetings.map((m) => (
                <MeetingRow key={m._id} meeting={m} actionItemCount={0} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "archived" && (
        <section className="space-y-4">
          {visibleSeries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No archived series.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visibleSeries.map((s) => (
                <MeetingSeriesCard
                  key={s._id}
                  series={s}
                  meetingCount={countById.get(s._id) ?? 0}
                  lastMeetingAt={null}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function TabLink({
  current,
  value,
  label,
}: {
  current: Tab;
  value: Tab;
  label: string;
}) {
  const active = current === value;
  const href =
    value === "recurring" ? "/library/meetings" : `/library/meetings?tab=${value}`;
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md border px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition-colors",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
