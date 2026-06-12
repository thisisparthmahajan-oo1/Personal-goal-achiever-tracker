"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import {
  updateMeetingSeriesAction,
  archiveMeetingSeriesAction,
  deleteMeetingSeriesAction,
} from "@/app/actions/meetings";
import type { MeetingSeries } from "@/lib/schemas";

export function SeriesHeader({ series }: { series: MeetingSeries }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(series.title);
  const [cadence, setCadence] = useState(series.cadence_label ?? "");
  const [attendees, setAttendees] = useState(series.default_attendees ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const cancel = () => {
    setTitle(series.title);
    setCadence(series.cadence_label ?? "");
    setAttendees(series.default_attendees ?? "");
    setEditing(false);
  };

  const save = () => {
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      await updateMeetingSeriesAction(series._id, {
        title: t,
        cadence_label: cadence.trim() || null,
        default_attendees: attendees.trim() || null,
      });
      setEditing(false);
    });
  };

  const toggleArchive = () => {
    startTransition(() =>
      archiveMeetingSeriesAction(series._id, !series.archived)
    );
  };

  const del = () => {
    if (
      !confirm(
        `Delete "${series.title}"? Past meetings stay but become ad-hoc (lose the series link).`
      )
    )
      return;
    startTransition(async () => {
      await deleteMeetingSeriesAction(series._id);
      router.push("/library/meetings");
    });
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter") save();
          }}
          disabled={pending}
          maxLength={200}
          className="priv w-full bg-transparent text-3xl font-semibold tracking-tight outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <input
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            placeholder="Cadence (e.g. Mondays 4pm)"
            disabled={pending}
            maxLength={100}
            className="priv min-w-[200px] flex-1 rounded-md border border-border/40 bg-card/40 px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <input
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="Default attendees"
            disabled={pending}
            maxLength={500}
            className="priv min-w-[220px] flex-1 rounded-md border border-border/40 bg-card/40 px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending || !title.trim()}
            title="Save"
            className="rounded p-1 text-primary hover:bg-primary/15 disabled:opacity-40"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            title="Cancel"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="priv text-3xl font-semibold tracking-tight">{series.title}</h1>
        {series.cadence_label && (
          <p className="priv mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {series.cadence_label}
          </p>
        )}
        {series.default_attendees && (
          <p className="priv mt-1 text-xs text-muted-foreground">
            Attendees: {series.default_attendees}
          </p>
        )}
        {series.archived && (
          <span className="mt-2 inline-block rounded-md border border-border/40 bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Archived
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          title="Edit series"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={toggleArchive}
          disabled={pending}
          title={series.archived ? "Restore series" : "Archive series"}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {series.archived ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          )}
        </button>
        <button
          type="button"
          onClick={del}
          disabled={pending}
          title="Delete series"
          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
