"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacy } from "./PrivacyProvider";

export function PrivacyToggle() {
  const { master, toggleMaster } = usePrivacy();
  return (
    <button
      type="button"
      onClick={toggleMaster}
      aria-pressed={!master}
      title={master ? "Show all" : "Hide all"}
      className="flex size-7 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      {master ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
    </button>
  );
}
