import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Plane } from "lucide-react";
import { listTrips } from "@/lib/repositories/trips";
import { getActiveProfileSlug } from "@/lib/profile";
import { NewTripForm } from "@/components/library/trips/NewTripForm";

export const dynamic = "force-dynamic";

export default async function TripsIndexPage() {
  // Trips is a personal-only shelf.
  const slug = await getActiveProfileSlug();
  if (slug === "office") notFound();

  const trips = await listTrips({ archived: false });

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Library
      </Link>

      <header className="mt-6 mb-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          <span className="text-primary">●</span>
          <span className="ml-2">Trips</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Travel plans</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One page per trip.
        </p>
      </header>

      <div className="mb-6">
        <NewTripForm />
      </div>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/40 bg-card/20 px-6 py-12 text-center text-sm text-muted-foreground">
          No trips yet. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((t) => (
            <Link
              key={t._id}
              href={`/library/trips/${t._id}`}
              className="group flex items-start gap-3 rounded-xl border border-border/40 bg-card/40 p-4 transition-colors hover:bg-card/60"
            >
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                <Plane className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="priv text-lg font-semibold tracking-tight">
                  {t.title}
                </h2>
                {t.destination && (
                  <p className="priv mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
                    {t.destination}
                  </p>
                )}
              </div>
              <ChevronRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
