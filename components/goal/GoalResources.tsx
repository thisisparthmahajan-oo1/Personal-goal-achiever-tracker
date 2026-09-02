"use client";

import { useState, useTransition } from "react";
import { Plus, X, Trash2, Copy, Check } from "lucide-react";
import {
  createGoalResourceAction,
  deleteGoalResourceAction,
} from "@/app/actions/goal-resources";
import type { GoalResource } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { pickIcon } from "./url-icons";

export function GoalResources({
  goalId,
  resources,
}: {
  goalId: string;
  resources: GoalResource[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {resources.map((r) => (
          <ResourcePill key={r._id} resource={r} />
        ))}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-card/30 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="size-3" />
            Add resource
          </button>
        )}
      </div>
      {adding && <AddResourceForm goalId={goalId} onDone={() => setAdding(false)} />}
    </div>
  );
}

function ResourcePill({ resource }: { resource: GoalResource }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const Icon = pickIcon(resource.url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resource.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API may be blocked — fall back silently
    }
  };

  return (
    <span className="group/pill relative inline-flex items-stretch">
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        title={resource.url}
        className="priv inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary transition-colors hover:bg-primary/20"
      >
        <Icon className="size-3" />
        {resource.label}
      </a>
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied!" : "Copy link"}
        className={cn(
          "ml-px inline-flex items-center justify-center rounded-md border border-border/30 bg-card/30 px-1 text-muted-foreground opacity-100 transition-opacity hover:text-primary sm:opacity-0 sm:group-hover/pill:opacity-100 sm:group-focus-within/pill:opacity-100",
          copied && "text-primary opacity-100"
        )}
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm(`Remove "${resource.label}"?`))
            startTransition(() => deleteGoalResourceAction(resource._id));
        }}
        disabled={pending}
        title="Remove"
        className={cn(
          "ml-px inline-flex items-center justify-center rounded-md border border-border/30 bg-card/30 px-1 text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover/pill:opacity-100 sm:group-focus-within/pill:opacity-100",
          pending && "opacity-100"
        )}
      >
        <Trash2 className="size-3" />
      </button>
    </span>
  );
}

function AddResourceForm({
  goalId,
  onDone,
}: {
  goalId: string;
  onDone: () => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const l = label.trim();
    const u = url.trim();
    if (!l || !u) return;
    startTransition(async () => {
      await createGoalResourceAction({ goal_id: goalId, label: l, url: u });
      setLabel("");
      setUrl("");
      onDone();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-card/40 px-3 py-2"
    >
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
        placeholder="Label (e.g. Production dashboard)"
        disabled={pending}
        className="min-w-[180px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
        placeholder="https://…"
        disabled={pending}
        className="min-w-[220px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <button
        type="submit"
        disabled={pending || !label.trim() || !url.trim()}
        className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onDone}
        disabled={pending}
        title="Cancel"
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </form>
  );
}
