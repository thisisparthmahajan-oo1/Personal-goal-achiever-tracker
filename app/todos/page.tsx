import { listOpen, listCompletedOn } from "@/lib/repositories/todos";
import { QuickAddTodo } from "@/components/todos/QuickAddTodo";
import { TodoRow } from "@/components/todos/TodoRow";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const today = new Date();
  const [openTodos, doneTodos] = await Promise.all([
    listOpen(),
    listCompletedOn(today),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          <span className="text-primary">●</span>
          <span className="ml-2">Daily TODOs</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Today's list</h1>
        <p className="priv mt-2 text-sm text-muted-foreground">
          {openTodos.length === 0
            ? "Nothing open."
            : `${openTodos.length} open · ${doneTodos.length} done today`}
        </p>
      </header>

      <div className="mb-8">
        <QuickAddTodo />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <span
            className="size-1 rounded-full bg-primary"
            style={{ boxShadow: "0 0 6px oklch(0.66 0.22 285)" }}
          />
          Open
        </h2>
        {openTodos.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
            No open todos.
          </div>
        ) : (
          <div className="space-y-2">
            {openTodos.map((t) => (
              <TodoRow key={t._id} todo={t} />
            ))}
          </div>
        )}
      </section>

      {doneTodos.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <span className="size-1 rounded-full bg-muted-foreground/60" />
            Completed today
          </h2>
          <div className="space-y-2 opacity-80">
            {doneTodos.map((t) => (
              <TodoRow key={t._id} todo={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
