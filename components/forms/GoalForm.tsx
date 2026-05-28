import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/lib/schemas";

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

type Props = {
  action: (formData: FormData) => Promise<void> | void;
  goal?: Goal;
  submitLabel?: string;
};

export function GoalForm({ action, goal, submitLabel = "Create goal" }: Props) {
  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title" className="uppercase text-xs tracking-[0.18em] text-muted-foreground">
          Title
        </Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={200}
          autoFocus
          defaultValue={goal?.title}
          placeholder="What are you focusing on?"
          className="text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="uppercase text-xs tracking-[0.18em] text-muted-foreground">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={goal?.description ?? ""}
          placeholder="Why does this matter? What's the desired outcome?"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="target_date" className="uppercase text-xs tracking-[0.18em] text-muted-foreground">
            Target date
          </Label>
          <Input
            id="target_date"
            name="target_date"
            type="date"
            defaultValue={toDateInput(goal?.target_date)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source" className="uppercase text-xs tracking-[0.18em] text-muted-foreground">
            Source
          </Label>
          <Input
            id="source"
            name="source"
            defaultValue={goal?.source ?? ""}
            placeholder="e.g. claude research 2026-05-20"
          />
        </div>
      </div>

      {goal && (
        <div className="space-y-2">
          <Label htmlFor="status" className="uppercase text-xs tracking-[0.18em] text-muted-foreground">
            Status
          </Label>
          <select
            id="status"
            name="status"
            defaultValue={goal.status}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" size="lg">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
