"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateGoalStatusAction } from "@/app/actions/goals";
import type { Status } from "@/lib/schemas";

export function GoalArchiveButton({
  goalId,
  status,
}: {
  goalId: string;
  status: Status;
}) {
  const [pending, startTransition] = useTransition();
  const archived = status === "archived";

  const toggle = () => {
    startTransition(() =>
      updateGoalStatusAction(goalId, archived ? "active" : "archived")
    );
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={pending}
      title={
        archived
          ? "Make this goal active again"
          : "Archive — hides it from the dashboard, keeps everything"
      }
    >
      {archived ? (
        <ArchiveRestore className="size-4" />
      ) : (
        <Archive className="size-4" />
      )}
      {archived ? "Restore" : "Archive"}
    </Button>
  );
}
