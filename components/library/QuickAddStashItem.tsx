"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createStashItemAction } from "@/app/actions/stash";
import { RichEditor } from "@/components/editor/RichEditor";
import { stripHtml } from "@/components/editor/plain-text";

export function QuickAddStashItem() {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const noteHasContent = stripHtml(note).length > 0;
  const canSubmit =
    label.trim().length > 0 && (url.trim().length > 0 || noteHasContent);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    startTransition(async () => {
      await createStashItemAction({
        label: label.trim(),
        url: url.trim() || null,
        note: noteHasContent ? note : null,
      });
      setLabel("");
      setUrl("");
      setNote("");
    });
  };

  const reset = () => {
    setLabel("");
    setUrl("");
    setNote("");
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-xl border border-border/40 bg-card/40 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") reset();
          }}
          placeholder="Label (required) — what is this?"
          disabled={pending}
          className="min-w-[200px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          maxLength={200}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") reset();
          }}
          placeholder="URL (optional)"
          disabled={pending}
          className="min-w-[240px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          maxLength={2000}
        />
      </div>
      <RichEditor
        value={note}
        onChange={setNote}
        placeholder="Note / content (optional) — paste a snippet, jot a thought, or leave empty"
        disabled={pending}
        compact
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
          Label + at least URL or note
        </p>
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Plus className="size-3" />
          Stash
        </button>
      </div>
    </form>
  );
}
