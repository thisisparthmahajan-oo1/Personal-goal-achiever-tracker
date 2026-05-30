import { BookRow } from "./BookRow";
import type { BookEntry } from "@/lib/schemas";

export function BookTable({ books }: { books: BookEntry[] }) {
  if (books.length === 0) {
    return (
      <div className="rounded-xl border border-border/30 bg-card/30 px-4 py-12 text-center text-sm text-muted-foreground">
        No books yet. Add your first one below.
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card/30">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <table className="w-full text-left">
        <thead className="border-b border-border/30">
          <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <th className="px-3 py-3 font-medium">Name</th>
            <th className="px-3 py-3 font-medium w-28">Type</th>
            <th className="px-3 py-3 font-medium">Domain</th>
            <th className="px-3 py-3 font-medium w-28">Status</th>
            <th className="px-3 py-3 font-medium w-32">Start</th>
            <th className="px-3 py-3 font-medium w-32">End</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {books.map((b) => (
            <BookRow key={b._id} book={b} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
