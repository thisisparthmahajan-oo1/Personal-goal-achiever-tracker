"use client";

import { useState, useTransition } from "react";
import { updateMeetingAction } from "@/app/actions/meetings";
import { RichEditor } from "@/components/editor/RichEditor";

export function MeetingNotesEditor({
  meetingId,
  initialBody,
}: {
  meetingId: string;
  initialBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [savedBody, setSavedBody] = useState(initialBody);
  const [pending, startTransition] = useTransition();

  const save = (html: string) => {
    if (html === savedBody) return;
    startTransition(async () => {
      await updateMeetingAction(meetingId, { body: html });
      setSavedBody(html);
      setBody(html);
    });
  };

  return (
    <div className="space-y-1.5">
      <RichEditor
        value={initialBody}
        onChange={setBody}
        onBlur={save}
        placeholder="Notes — attendees, agenda, discussion, decisions…"
        disabled={pending}
        className="min-h-[240px]"
      />
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
        {pending
          ? "Saving…"
          : body === savedBody
            ? "Saved"
            : "Unsaved — blur or click outside to save"}
      </p>
    </div>
  );
}
