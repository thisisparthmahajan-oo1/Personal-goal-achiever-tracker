"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Copy, Check, Pencil, Trash2, X } from "lucide-react";
import {
  updateStashItemAction,
  deleteStashItemAction,
} from "@/app/actions/stash";
import { pickIcon, urlHostLabel } from "@/components/goal/url-icons";
import type { StashItem } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function StashItemCard({ item }: { item: StashItem }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [url, setUrl] = useState(item.url);
  const [note, setNote] = useState(item.note ?? "");
  const [copied, setCopied] = useState(false);

  const Icon = pickIcon(item.url);

  const cancel = () => {
    setLabel(item.label);
    setUrl(item.url);
    setNote(item.note ?? "");
    setEditing(false);
  };

  const save = () => {
    const l = label.trim();
    const u = url.trim();
    if (!l || !u) return;
    startTransition(async () => {
      await updateStashItemAction(item._id, {
        label: l,
        url: u,
        note: note.trim() || null,
      });
      setEditing(false);
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — fall through
    }
  };

  if (editing) {
    return (
      <div className="space-y-2 rounded-xl border border-primary/30 bg-card/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            disabled={pending}
            className="priv min-w-[200px] flex-1 bg-transparent text-sm outline-none"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            disabled={pending}
            className="priv min-w-[240px] flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            placeholder="One-line note (optional)"
            disabled={pending}
            maxLength={500}
            className="priv flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending || !label.trim() || !url.trim()}
            className="rounded p-1 text-primary hover:bg-primary/15 disabled:opacity-40"
            title="Save"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Cancel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-border/30 bg-card/40 p-3 transition-colors hover:bg-card/60">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          title={item.url}
          className="priv block truncate text-sm font-medium text-foreground hover:text-primary"
        >
          {item.label}
        </a>
        <p className="priv mt-0.5 truncate text-[11px] text-muted-foreground/70">
          {urlHostLabel(item.url)}
        </p>
        {item.note && (
          <p className="priv mt-1 whitespace-pre-wrap text-[12px] italic text-muted-foreground">
            {item.note}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="priv mr-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
          {formatDistanceToNowStrict(item.created_at, { addSuffix: true })}
        </span>
        <button
          type="button"
          onClick={copy}
          title={copied ? "Copied!" : "Copy link"}
          className={cn(
            "rounded p-1 text-muted-foreground transition-opacity hover:text-primary",
            copied ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          title="Edit"
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Remove "${item.label}"?`))
              startTransition(() => deleteStashItemAction(item._id));
          }}
          disabled={pending}
          title="Remove"
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
