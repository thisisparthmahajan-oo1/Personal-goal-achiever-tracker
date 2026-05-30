"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createBookAction } from "@/app/actions/books";
import type { BookType } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function AddBookInline() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<BookType>("fiction");
  const [domains, setDomains] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      await createBookAction({
        title: t,
        type,
        domains: domains
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      });
      setTitle("");
      setDomains("");
      setType("fiction");
      // Keep form open for batch add.
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Plus className="size-3.5" />
        Add book
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/40 px-3 py-2"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Book title"
        disabled={pending}
        className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <div className="flex gap-0.5 rounded-md bg-muted/30 p-0.5">
        {(["fiction", "non-fiction"] as BookType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded px-2 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors",
              type === t
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <input
        value={domains}
        onChange={(e) => setDomains(e.target.value)}
        placeholder="domains (comma sep)"
        disabled={pending}
        className="w-48 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setTitle("");
          setDomains("");
        }}
        className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}
