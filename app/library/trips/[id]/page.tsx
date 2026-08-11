import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTrip } from "@/lib/repositories/trips";
import { listSections, listItems, listSpots } from "@/lib/repositories/trip-sections";
import { getActiveProfileSlug } from "@/lib/profile";
import { TripHero } from "@/components/library/trips/TripHero";
import { SectionTree } from "@/components/library/trips/SectionTree";

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

  const [sections, items, spots] = await Promise.all([
    listSections(trip._id),
    listItems(trip._id),
    listSpots(trip._id),
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

      <SectionTree tripId={trip._id} sections={sections} items={items} spots={spots} />
    </div>
  );
}
