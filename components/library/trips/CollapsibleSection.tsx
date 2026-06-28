"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  badge,
  icon,
  defaultOpen = true,
  children,
  actions,
}: {
  title: string;
  badge?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-border/30 bg-card/30">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              !open && "-rotate-90"
            )}
          />
          {icon && (
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              {icon}
            </span>
          )}
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {badge !== undefined && badge !== null && (
            <span className="ml-1 rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {badge}
            </span>
          )}
        </button>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {open && (
        <div className="border-t border-border/20 px-4 py-3">{children}</div>
      )}
    </section>
  );
}
