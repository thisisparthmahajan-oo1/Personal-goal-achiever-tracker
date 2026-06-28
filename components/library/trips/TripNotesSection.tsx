"use client";

import { useState, useTransition } from "react";
import { StickyNote } from "lucide-react";
import { setTripNotesAction } from "@/app/actions/trips";
import { RichEditor } from "@/components/editor/RichEditor";
import { CollapsibleSection } from "@/components/library/trips/CollapsibleSection";

export function TripNotesSection({
  tripId,
  initialBody,
}: {
  tripId: string;
  initialBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [saved, setSaved] = useState(initialBody);
  const [pending, startTransition] = useTransition();

  const save = (html: string) => {
    if (html === saved) return;
    startTransition(async () => {
      await setTripNotesAction(tripId, html);
      setSaved(html);
      setBody(html);
    });
  };

  return (
    <CollapsibleSection
      title="Notes"
      icon={<StickyNote className="size-3.5" />}
      badge={saved.trim() ? "filled" : "empty"}
      defaultOpen={false}
    >
      <RichEditor
        value={initialBody}
        onChange={setBody}
        onBlur={save}
        placeholder="Reel ideas, outfit notes, food finds, research links…"
        disabled={pending}
        className="min-h-[160px]"
      />
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
        {pending ? "Saving…" : body === saved ? "Saved" : "Unsaved — blur to save"}
      </p>
    </CollapsibleSection>
  );
}
