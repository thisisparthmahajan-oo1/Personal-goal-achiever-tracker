"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createMeetingAction } from "@/app/actions/meetings";
import { cn } from "@/lib/utils";

export function NewMeetingButton({
  seriesId,
  label = "New meeting",
  className,
}: {
  seriesId?: string | null;
  label?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const create = () => {
    startTransition(async () => {
      const meeting = await createMeetingAction({
        series_id: seriesId ?? null,
      });
      if (meeting) router.push(`/library/meetings/${meeting._id}`);
    });
  };

  return (
    <button
      type="button"
      onClick={create}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50",
        className
      )}
    >
      <Plus className="size-3" />
      {pending ? "Creating…" : label}
    </button>
  );
}
