"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveProfileAction } from "@/app/actions/profile";
import type { Profile } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function ProfileSwitcher({
  profiles,
  activeSlug,
}: {
  profiles: Profile[];
  activeSlug: string;
}) {
  const [pending, startTransition] = useTransition();
  if (profiles.length === 0) return null;

  const active = profiles.find((p) => p.slug === activeSlug) ?? profiles[0];
  const tint =
    active.kind === "office"
      ? "border-[oklch(0.78_0.16_78)]/40 bg-[oklch(0.78_0.16_78)]/15 text-[oklch(0.85_0.14_78)]"
      : "border-primary/40 bg-primary/15 text-primary";

  return (
    <Select
      value={active.slug}
      onValueChange={(next) => {
        if (!next || next === active.slug || pending) return;
        startTransition(() => setActiveProfileAction(next));
      }}
      disabled={pending}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          "h-7 w-full justify-between gap-2 rounded-md border px-2 text-[10px] uppercase tracking-[0.16em]",
          tint,
          pending && "opacity-60"
        )}
      >
        <SelectValue>{active.name}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-[160px]">
        {profiles.map((p) => {
          const itemTint =
            p.kind === "office"
              ? "border-[oklch(0.78_0.16_78)]/35 bg-[oklch(0.78_0.16_78)]/12 text-[oklch(0.85_0.14_78)]"
              : "border-primary/35 bg-primary/12 text-primary";
          return (
            <SelectItem key={p._id} value={p.slug} className="text-[11px]">
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0 text-[10px] uppercase tracking-[0.14em]",
                  itemTint
                )}
              >
                {p.name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
