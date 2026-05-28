"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Target, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type GoalRef = { _id: string; title: string };

type Item = {
  id: string;
  label: string;
  sub?: string;
  icon: typeof Target;
  run: () => void;
};

export function CommandPalette({ goals }: { goals: GoalRef[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  const items: Item[] = useMemo(() => {
    const base: Item[] = [
      {
        id: "dashboard",
        label: "Go to dashboard",
        icon: Target,
        run: () => {
          router.push("/");
          setOpen(false);
        },
      },
      {
        id: "new-goal",
        label: "Create new goal",
        icon: Plus,
        run: () => {
          router.push("/goals/new");
          setOpen(false);
        },
      },
      ...goals.map(
        (g): Item => ({
          id: g._id,
          label: g.title,
          sub: "Goal",
          icon: Target,
          run: () => {
            router.push(`/goals/${g._id}`);
            setOpen(false);
          },
        })
      ),
    ];
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((i) => i.label.toLowerCase().includes(q));
  }, [query, goals, router]);

  useEffect(() => {
    if (cursor >= items.length) setCursor(Math.max(0, items.length - 1));
  }, [items.length, cursor]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(items.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[cursor]?.run();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
      >
        <Search className="size-3.5" />
        <span>Quick jump</span>
        <span className="rounded border border-border/60 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] tracking-tight">
          ⌘K
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass max-w-xl p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <DialogDescription className="sr-only">
            Quick navigation and actions
          </DialogDescription>
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={handleKey}
              placeholder="Jump to anything…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </span>
          </div>
          <ul className="max-h-[55vh] overflow-y-auto p-2">
            {items.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                No matches
              </li>
            ) : (
              items.map((i, idx) => {
                const Icon = i.icon;
                const active = idx === cursor;
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(idx)}
                      onClick={i.run}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        active && "bg-primary/10 text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="flex-1 truncate">{i.label}</span>
                      {i.sub && (
                        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {i.sub}
                        </span>
                      )}
                      {active && <ArrowRight className="size-3.5 text-primary" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-background/40 px-1 font-mono">↑</kbd>
                <kbd className="rounded border border-border/60 bg-background/40 px-1 font-mono">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-background/40 px-1 font-mono">↵</kbd>
                select
              </span>
            </div>
            <span>{items.length} results</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
