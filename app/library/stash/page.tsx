import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { list as listStash } from "@/lib/repositories/stash";
import { QuickAddStashItem } from "@/components/library/QuickAddStashItem";
import { StashItemCard } from "@/components/library/StashItemCard";

export const dynamic = "force-dynamic";

export default async function StashPage() {
  const items = await listStash();

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
          <span className="ml-2">Library / Stash</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Stash</h1>
        <p className="priv mt-2 text-sm text-muted-foreground">
          {items.length === 0
            ? "No items yet — drop ad-hoc links you stumble upon below."
            : `${items.length} item${items.length === 1 ? "" : "s"}`}
        </p>
      </header>

      <div className="mb-8">
        <QuickAddStashItem />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing stashed yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <StashItemCard key={it._id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}
