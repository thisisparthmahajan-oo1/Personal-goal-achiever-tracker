"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addBookSectionAction } from "@/app/actions/books";
import { BookSectionEditor } from "@/components/notes/BookSectionEditor";
import type { BookSection } from "@/lib/schemas";

export function BookSectionsList({
  bookId,
  sections,
}: {
  bookId: string;
  sections: BookSection[];
}) {
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const submitAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    startTransition(async () => {
      await addBookSectionAction({
        book_id: bookId,
        title: draftTitle.trim(),
      });
      setDraftTitle("");
      setAdding(false);
    });
  };

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        Sections
      </h2>

      {sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((s) => (
            <BookSectionEditor key={s.id} bookId={bookId} section={s} />
          ))}
        </div>
      )}

      {adding ? (
        <form
          onSubmit={submitAdd}
          className="flex items-center gap-2 rounded-xl border border-primary/30 bg-card/40 px-3 py-2"
        >
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraftTitle("");
                setAdding(false);
              }
            }}
            placeholder="Section title (optional)…"
            disabled={pending}
            maxLength={120}
            className="priv flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftTitle("");
              setAdding(false);
            }}
            disabled={pending}
            className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="size-3" />
          Add section
        </button>
      )}
    </section>
  );
}
