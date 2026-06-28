"use client";

import { ListChecks } from "lucide-react";
import type { TripItem } from "@/lib/schemas";
import { CollapsibleSection } from "@/components/library/trips/CollapsibleSection";
import { TripItemRow } from "@/components/library/trips/TripItemRow";
import { QuickAddTripItem } from "@/components/library/trips/QuickAddTripItem";

export function PrepChecklistSection({
  tripId,
  items,
}: {
  tripId: string;
  items: TripItem[];
}) {
  const done = items.filter((i) => i.status === "completed").length;
  return (
    <CollapsibleSection
      title="Prep checklist"
      icon={<ListChecks className="size-3.5" />}
      badge={
        items.length === 0
          ? "empty"
          : `${done}/${items.length} done`
      }
      defaultOpen={false}
    >
      <div className="space-y-2">
        <QuickAddTripItem tripId={tripId} />
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Use this for one-off pre-trip tasks (visa, SIM, insurance, app downloads, etc.).
          </p>
        ) : (
          items.map((it) => <TripItemRow key={it._id} item={it} />)
        )}
      </div>
    </CollapsibleSection>
  );
}
