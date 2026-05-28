"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacy } from "./PrivacyProvider";
import { cn } from "@/lib/utils";

export function PrivacyEye({ id, className }: { id: string; className?: string }) {
  const { isHidden, toggleCard } = usePrivacy();
  const hidden = isHidden(id);
  return (
    <button
      type="button"
      onClick={() => toggleCard(id)}
      aria-pressed={!hidden}
      title={hidden ? "Reveal this goal" : "Hide this goal"}
      className={cn(
        "flex h-7 items-center justify-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
        className
      )}
    >
      {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
    </button>
  );
}
