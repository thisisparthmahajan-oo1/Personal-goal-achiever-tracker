"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setBookStatusAction } from "@/app/actions/books";
import type { BookStatus } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const STYLE: Record<BookStatus, string> = {
  pipelined:
    "border-[oklch(0.6_0.16_155)]/35 bg-[oklch(0.6_0.16_155)]/12 text-[oklch(0.82_0.14_155)]",
  "in-progress":
    "border-primary/35 bg-primary/12 text-primary",
  completed:
    "border-border bg-muted/40 text-muted-foreground",
};

const LABEL: Record<BookStatus, string> = {
  pipelined: "Pipelined",
  "in-progress": "In-progress",
  completed: "Completed",
};

export function StatusPill({
  id,
  status,
}: {
  id: string;
  status: BookStatus;
}) {
  const [pending, startTransition] = useTransition();
  const handle = (value: BookStatus | null) => {
    if (!value || value === status) return;
    startTransition(() => setBookStatusAction(id, value));
  };
  return (
    <Select value={status} onValueChange={handle} disabled={pending}>
      <SelectTrigger
        size="sm"
        className={cn(
          "!h-6 gap-1 rounded-md border px-2 py-0 text-[10px] font-medium uppercase tracking-[0.14em] transition-opacity hover:opacity-80",
          STYLE[status],
          pending && "opacity-50"
        )}
      >
        <SelectValue>{LABEL[status]}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-[140px]">
        <SelectItem value="pipelined" className="text-[11px]">
          <span className="rounded-md border border-[oklch(0.6_0.16_155)]/35 bg-[oklch(0.6_0.16_155)]/12 px-1.5 py-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[oklch(0.82_0.14_155)]">
            Pipelined
          </span>
        </SelectItem>
        <SelectItem value="in-progress" className="text-[11px]">
          <span className="rounded-md border border-primary/35 bg-primary/12 px-1.5 py-0 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
            In-progress
          </span>
        </SelectItem>
        <SelectItem value="completed" className="text-[11px]">
          <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Completed
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
