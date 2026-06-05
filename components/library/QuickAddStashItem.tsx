"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createStashItemAction } from "@/app/actions/stash";

export function QuickAddStashItem() {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const l = label.trim();
    const u = url.trim();
    if (!l || !u) return;
    startTransition(async () => {
      await createStashItemAction({
        label: l,
        url: u,
        note: note.trim() || null,
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
          placeholder="Label (what is it?)"
          disabled={pending}
          className="min-w-[200px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") reset();
          }}
          placeholder="URL or file://…"
          disabled={pending}
          className="min-w-[240px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") reset();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="One-line note (optional) — why are you saving this?"
          disabled={pending}
          className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={pending || !label.trim() || !url.trim()}
          className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Plus className="size-3" />
          Stash
        </button>
      </div>
    </form>
  );
}
