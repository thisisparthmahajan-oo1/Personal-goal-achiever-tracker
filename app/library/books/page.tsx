import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BookTable } from "@/components/notes/BookTable";
import { AddBookInline } from "@/components/notes/AddBookInline";
import { list as listBooks } from "@/lib/repositories/books";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const books = await listBooks();
  const completed = books.filter((b) => b.status === "completed").length;
  const inProgress = books.filter((b) => b.status === "in-progress").length;
  const pipelined = books.filter((b) => b.status === "pipelined").length;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Library
      </Link>

      <header className="mt-6 mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
            <span className="text-primary">●</span>
            <span className="ml-2">Library / Books</span>
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Books to read</h1>
          <p className="priv mt-2 text-sm text-muted-foreground">
            {books.length === 0
              ? "Nothing logged yet."
              : `${books.length} total · ${pipelined} pipelined · ${inProgress} in progress · ${completed} completed`}
          </p>
        </div>
      </header>

      <BookTable books={books} />

      <div className="mt-4">
        <AddBookInline />
      </div>
    </div>
  );
}
