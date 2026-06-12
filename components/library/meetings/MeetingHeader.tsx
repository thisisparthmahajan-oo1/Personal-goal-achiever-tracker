"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Trash2 } from "lucide-react";
import {
  updateMeetingAction,
  deleteMeetingAction,
} from "@/app/actions/meetings";
import type { Meeting } from "@/lib/schemas";

export function MeetingHeader({ meeting }: { meeting: Meeting }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(meeting.title);
  const [dateStr, setDateStr] = useState(format(meeting.meeting_date, "yyyy-MM-dd"));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const cancel = () => {
    setTitle(meeting.title);
    setDateStr(format(meeting.meeting_date, "yyyy-MM-dd"));
    setEditing(false);
  };

  const save = () => {
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      await updateMeetingAction(meeting._id, {
        title: t,
        meeting_date: new Date(`${dateStr}T12:00:00`),
      });
      setEditing(false);
    });
  };

  const del = () => {
    if (!confirm(`Delete "${meeting.title}"? Linked TODOs will be detached but kept.`))
      return;
    startTransition(async () => {
      await deleteMeetingAction(meeting._id);
      if (meeting.series_id) {
        router.push(`/library/meetings/series/${meeting.series_id}`);
      } else {
        router.push("/library/meetings");
      }
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
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            disabled={pending}
            className="priv rounded-md border border-border/40 bg-card/40 px-2 py-1 text-sm outline-none"
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
        <h1 className="priv text-3xl font-semibold tracking-tight">{meeting.title}</h1>
        <p className="priv mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {format(meeting.meeting_date, "EEE, MMM d, yyyy")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          title="Edit title / date"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={del}
          disabled={pending}
          title="Delete meeting"
          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
