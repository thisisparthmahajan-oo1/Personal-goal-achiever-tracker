import type { Movement } from "@/lib/gym-plan";

export function MovementList({ items }: { items: Movement[] }) {
  return (
    <ul className="space-y-2">
      {items.map((m, i) => (
        <li
          key={i}
          className="flex items-baseline gap-3 rounded-lg border border-border/20 bg-card/30 px-3 py-2"
        >
          <span className="text-sm font-medium text-foreground/90">{m.name}</span>
          <span className="ml-auto text-right text-[11px] text-muted-foreground/80">
            {m.cue}
          </span>
        </li>
      ))}
    </ul>
  );
}
