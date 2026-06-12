"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Copy, Check, Pencil, Trash2, X, StickyNote } from "lucide-react";
import {
  updateStashItemAction,
  deleteStashItemAction,
} from "@/app/actions/stash";
import { pickIcon, urlHostLabel } from "@/components/goal/url-icons";
import type { StashItem } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/editor/RichEditor";
import { RichRender } from "@/components/editor/RichRender";
import { stripHtml } from "@/components/editor/plain-text";

export function StashItemCard({ item }: { item: StashItem }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [url, setUrl] = useState(item.url ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [copied, setCopied] = useState(false);

  const hasUrl = !!item.url;
  const Icon = hasUrl && item.url ? pickIcon(item.url) : StickyNote;

  const noteHasContent = stripHtml(note).length > 0;
  const canSave =
    label.trim().length > 0 && (url.trim().length > 0 || noteHasContent);

  const cancel = () => {
    setLabel(item.label);
    setUrl(item.url ?? "");
    setNote(item.note ?? "");
    setEditing(false);
  };

  const save = () => {
    if (!canSave) return;
    startTransition(async () => {
      await updateStashItemAction(item._id, {
        label: label.trim(),
        url: url.trim() || null,
        note: noteHasContent ? note : null,
      });
      setEditing(false);
    });
  };

  const copy = async () => {
    const text = item.url ?? (item.note ? stripHtml(item.note) : "");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
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
            maxLength={200}
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
            placeholder="URL (optional)"
            maxLength={2000}
            className="priv min-w-[240px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <RichEditor
          value={note}
          onChange={setNote}
          placeholder="Note / content (optional)"
          disabled={pending}
          compact
        />
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={save}
            disabled={pending || !canSave}
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
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border",
          hasUrl
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border/40 bg-muted/30 text-muted-foreground"
        )}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        {hasUrl && item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={item.url}
            className="priv block truncate text-sm font-medium text-foreground hover:text-primary"
          >
            {item.label}
          </a>
        ) : (
          <p className="priv truncate text-sm font-medium text-foreground">
            {item.label}
          </p>
        )}
        {hasUrl && item.url && (
          <p className="priv mt-0.5 truncate text-[11px] text-muted-foreground/70">
            {urlHostLabel(item.url)}
          </p>
        )}
        {item.note && (
          <RichRender
            html={item.note}
            className={cn(
              "text-[12px] text-muted-foreground",
              hasUrl ? "mt-1 italic" : "mt-1"
            )}
          />
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="priv mr-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
          {formatDistanceToNowStrict(item.created_at, { addSuffix: true })}
        </span>
        <button
          type="button"
          onClick={copy}
          title={copied ? "Copied!" : hasUrl ? "Copy link" : "Copy text"}
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
