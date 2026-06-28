import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getTrip,
  listItems,
  listStays,
  listTransport,
  listActivities,
  listBudget,
} from "@/lib/repositories/trips";
import { getActiveProfileSlug } from "@/lib/profile";
import { TripHero } from "@/components/library/trips/TripHero";
import { StaysSection } from "@/components/library/trips/StaysSection";
import { ItinerarySection } from "@/components/library/trips/ItinerarySection";
import { BudgetSection } from "@/components/library/trips/BudgetSection";
import { PrepChecklistSection } from "@/components/library/trips/PrepChecklistSection";
import { TripNotesSection } from "@/components/library/trips/TripNotesSection";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const slug = await getActiveProfileSlug();
  if (slug === "office") notFound();

  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  const [items, stays, transport, activities, budget] = await Promise.all([
    listItems(trip._id),
    listStays(trip._id),
    listTransport(trip._id),
    listActivities(trip._id),
    listBudget(trip._id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/library/trips"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Trips
      </Link>

      <div className="mt-6 mb-8">
        <TripHero trip={trip} />
      </div>

      <div className="space-y-3">
        <ItinerarySection
          trip={trip}
          activities={activities}
          currency={trip.currency}
        />
        <StaysSection
          tripId={trip._id}
          stays={stays}
          legs={transport}
          currency={trip.currency}
        />
        <BudgetSection
          tripId={trip._id}
          items={budget}
          currency={trip.currency}
        />
        <PrepChecklistSection tripId={trip._id} items={items} />
        <TripNotesSection tripId={trip._id} initialBody={trip.notes} />
      </div>
    </div>
  );
}
