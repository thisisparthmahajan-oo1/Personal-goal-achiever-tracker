import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { get as getBook } from "@/lib/repositories/books";
import { BookNotesEditor } from "@/components/notes/BookNotesEditor";
import { BookSectionsList } from "@/components/notes/BookSectionsList";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/library/books"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Books
      </Link>

      <div className="mt-6 mb-6 space-y-2">
        <h1 className="priv text-2xl font-semibold tracking-tight">
          {book.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
              book.type === "fiction"
                ? "border-[oklch(0.58_0.12_30)]/35 bg-[oklch(0.58_0.12_30)]/12 text-[oklch(0.82_0.12_30)]"
                : "border-[oklch(0.6_0.14_5)]/35 bg-[oklch(0.6_0.14_5)]/12 text-[oklch(0.82_0.14_5)]"
            )}
          >
            {book.type}
          </span>
          <span className="rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {book.status}
          </span>
          {book.domains.map((d, i) => (
            <span
              key={i}
              className="priv rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <section className="mb-8 space-y-2">
        <h2 className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Notes
        </h2>
        <BookNotesEditor bookId={book._id} initialBody={book.body} />
      </section>

      <div className="mb-8">
        <BookSectionsList bookId={book._id} sections={book.sections} />
      </div>
    </div>
  );
}
