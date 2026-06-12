import Link from "next/link";
import { Dumbbell, BookOpen, Bookmark, Users, ChevronRight } from "lucide-react";
import { list as listBooks } from "@/lib/repositories/books";
import { count as countStash } from "@/lib/repositories/stash";
import {
  listSeries as listMeetingSeries,
  countAdhocMeetings,
} from "@/lib/repositories/meetings";
import { getActiveProfileSlug } from "@/lib/profile";
import type { ProfileKind } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Tile = {
  href: string;
  label: string;
  sublabel: string;
  icon: typeof Dumbbell;
  meta: string;
  /** Profile kinds where this tile is available. */
  availableIn: ProfileKind[];
};

export default async function LibraryIndexPage() {
  const activeSlug = await getActiveProfileSlug();
  // Slug doubles as kind for the seeded profiles; if more profiles are added
  // later this will need a real kind lookup.
  const activeKind: ProfileKind = activeSlug === "office" ? "office" : "personal";

  const [books, stashCount, activeSeries, adhocCount] = await Promise.all([
    listBooks(),
    countStash(),
    listMeetingSeries({ archived: false }),
    countAdhocMeetings(),
  ]);
  const inProgress = books.filter((b) => b.status === "in-progress").length;
  const completed = books.filter((b) => b.status === "completed").length;
  const seriesCount = activeSeries.length;

  const allTiles: Tile[] = [
    {
      href: "/library/gym",
      label: "Gym",
      sublabel: "4-day split",
      icon: Dumbbell,
      meta: "Day 1 · Day 2 · Day 3 · Day 4",
      availableIn: ["personal"],
    },
    {
      href: "/library/books",
      label: "Books",
      sublabel: "Reading journal",
      icon: BookOpen,
      meta: `${books.length} total · ${inProgress} reading · ${completed} done`,
      availableIn: ["personal"],
    },
    {
      href: "/library/stash",
      label: "Stash",
      sublabel: "Ad-hoc links",
      icon: Bookmark,
      meta: `${stashCount} item${stashCount === 1 ? "" : "s"}`,
      availableIn: ["personal", "office"],
    },
    {
      href: "/library/meetings",
      label: "Meetings",
      sublabel: "Series + ad-hoc",
      icon: Users,
      meta: `${seriesCount} series · ${adhocCount} ad-hoc`,
      availableIn: ["personal", "office"],
    },
  ];

  const tiles = allTiles.filter((t) => t.availableIn.includes(activeKind));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          <span className="text-primary">●</span>
          <span className="ml-2">Library</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Reference & journals</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Static-ish things that aren't goals or habits — gym splits, reading
          journals, anything else worth a single page.
        </p>
      </header>

      {tiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/40 bg-card/20 px-6 py-12 text-center text-sm text-muted-foreground">
          No shelves for this profile yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="group relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:bg-card/80"
                style={{ boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.05)" }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {t.label}
                    </h2>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {t.sublabel}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="priv text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70">
                  {t.meta}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
