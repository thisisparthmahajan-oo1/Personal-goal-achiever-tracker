"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Eye, EyeOff, Trash2 } from "lucide-react";
import {
  updateMeetingSectionAction,
  removeMeetingSectionAction,
} from "@/app/actions/meetings";
import { RichEditor } from "@/components/editor/RichEditor";
import { stripHtml } from "@/components/editor/plain-text";
import type { MeetingSection } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function MeetingSectionEditor({
  meetingId,
  section,
}: {
  meetingId: string;
  section: MeetingSection;
}) {
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.body);
  const [savedTitle, setSavedTitle] = useState(section.title);
  const [savedBody, setSavedBody] = useState(section.body);
  const [expanded, setExpanded] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  const commitTitle = () => {
    const next = title.trim();
    if (next === savedTitle) return;
    setTitle(next);
    startTransition(async () => {
      await updateMeetingSectionAction(meetingId, section.id, { title: next });
      setSavedTitle(next);
    });
  };

  const commitBody = (html: string) => {
    if (html === savedBody) return;
    startTransition(async () => {
      await updateMeetingSectionAction(meetingId, section.id, { body: html });
      setSavedBody(html);
      setBody(html);
    });
  };

  const remove = () => {
    const label = (title || "this section").trim();
    if (!confirm(`Delete "${label}"?`)) return;
    startTransition(async () => {
      await removeMeetingSectionAction(meetingId, section.id);
    });
  };

  const dirty = title !== savedTitle || body !== savedBody;
  const collapsedPreview = stripHtml(body).replace(/\s+/g, " ").trim();

  return (
    <div className="rounded-xl border border-border/30 bg-card/30">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Collapse" : "Expand"}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              !expanded && "-rotate-90"
            )}
          />
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setTitle(savedTitle);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Section title (e.g. Agenda, Discussion, Decisions)"
          disabled={pending}
          maxLength={120}
          className="priv flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/50"
        />
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          title={hidden ? "Reveal contents" : "Hide contents"}
          className={cn(
            "shrink-0 rounded p-1 transition-colors hover:bg-muted hover:text-foreground",
            hidden ? "text-primary" : "text-muted-foreground"
          )}
        >
          {hidden ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          title="Delete section"
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-border/20 px-3 pb-2 pt-1">
          <div
            className={cn(
              "transition-[filter] duration-200",
              hidden && "pointer-events-none select-none blur-[8px]"
            )}
            aria-hidden={hidden}
          >
            <RichEditor
              value={section.body}
              onChange={setBody}
              onBlur={commitBody}
              placeholder="Notes for this section…"
              disabled={pending || hidden}
              bare
            />
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
            {hidden
              ? "Hidden"
              : pending
                ? "Saving…"
                : dirty
                  ? "Unsaved — blur to save"
                  : "Saved"}
          </p>
        </div>
      ) : hidden ? (
        <div className="border-t border-border/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Hidden
        </div>
      ) : (
        collapsedPreview && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="priv block w-full border-t border-border/20 px-3 py-2 text-left text-[12px] text-muted-foreground/80 line-clamp-1 hover:text-foreground"
            title="Click to expand"
          >
            {collapsedPreview}
          </button>
        )
      )}
    </div>
  );
}
