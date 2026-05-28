import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-8 py-32 text-center">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-3">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Goal not found</h1>
      <p className="mt-3 text-muted-foreground">
        It may have been deleted, or the link is wrong.
      </p>
      <Link href="/" className={`${buttonVariants()} mt-8`}>
        Back to dashboard
      </Link>
    </main>
  );
}
