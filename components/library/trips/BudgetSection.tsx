"use client";

import { useMemo, useState, useTransition } from "react";
import { IndianRupee, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createBudgetItemAction,
  updateBudgetItemAction,
  deleteBudgetItemAction,
} from "@/app/actions/trips";
import { formatMoney } from "@/lib/trip-helpers";
import type { TripBudgetItem } from "@/lib/schemas";
import { CollapsibleSection } from "@/components/library/trips/CollapsibleSection";

const SUGGESTED_CATEGORIES = ["Stay", "Transport", "Food", "Activities", "Shopping", "Misc"];

export function BudgetSection({
  tripId,
  items,
  currency,
}: {
  tripId: string;
  items: TripBudgetItem[];
  currency: string;
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, TripBudgetItem[]>();
    for (const i of items) {
      const k = i.category || "Misc";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(i);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const totalEst = items.reduce((s, x) => s + x.estimated, 0);
  const totalAct = items.reduce(
    (s, x) => s + (x.actual ?? 0),
    0
  );
  const hasActuals = items.some((x) => x.actual !== null);

  return (
    <CollapsibleSection
      title="Budget"
      icon={<IndianRupee className="size-3.5" />}
      badge={
        items.length === 0
          ? "empty"
          : `${formatMoney(totalEst, currency)}${hasActuals ? ` est · ${formatMoney(totalAct, currency)} actual` : ""}`
      }
      defaultOpen={false}
    >
      <div className="space-y-3">
        {grouped.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            No line items yet. Add what you expect to spend, then update actuals as you go.
          </p>
        )}
        {grouped.map(([cat, list]) => {
          const est = list.reduce((s, x) => s + x.estimated, 0);
          const act = list.reduce((s, x) => s + (x.actual ?? 0), 0);
          const anyActual = list.some((x) => x.actual !== null);
          return (
            <div key={cat} className="rounded-xl border border-border/30 bg-card/20 p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="priv text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {cat}
                </h3>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatMoney(est, currency)}
                  {anyActual ? ` est · ${formatMoney(act, currency)} actual` : ""}
                </span>
              </div>
              <div className="space-y-1.5">
                {list.map((i) => (
                  <BudgetRow key={i._id} item={i} currency={currency} />
                ))}
              </div>
            </div>
          );
        })}
        <AddBudgetForm tripId={tripId} />
        {items.length > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            <span className="text-[11px] uppercase tracking-[0.2em] text-primary">
              Total
            </span>
            <span className="font-mono text-primary">
              {formatMoney(totalEst, currency)}
              {hasActuals && (
                <span className="ml-2 text-primary/70">
                  · {formatMoney(totalAct, currency)} actual
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

function BudgetRow({ item, currency }: { item: TripBudgetItem; currency: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  if (editing) {
    return <EditBudgetForm item={item} onClose={() => setEditing(false)} />;
  }
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/30 bg-card/40 px-3 py-1.5">
      <span className="priv min-w-0 flex-1 truncate text-sm">{item.label}</span>
      {item.paid_by && (
        <span className="priv text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
          {item.paid_by}
        </span>
      )}
      <span className="priv font-mono text-[12px] text-muted-foreground">
        {formatMoney(item.estimated, currency)}
        {item.actual !== null && (
          <span className="ml-1 text-foreground/80">
            → {formatMoney(item.actual, currency)}
          </span>
        )}
      </span>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${item.label}"?`))
              startTransition(() => deleteBudgetItemAction(item._id, item.trip_id));
          }}
          disabled={pending}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}

function AddBudgetForm({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Misc");
  const [estimated, setEstimated] = useState("");
  const [actual, setActual] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!label.trim()) return;
    startTransition(async () => {
      await createBudgetItemAction({
        trip_id: tripId,
        label: label.trim(),
        category,
        estimated: estimated ? Number(estimated) : 0,
        actual: actual ? Number(actual) : null,
        paid_by: paidBy.trim() || null,
      });
      setLabel(""); setCategory("Misc"); setEstimated(""); setActual(""); setPaidBy("");
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/40 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-foreground"
      >
        <Plus className="size-3" />
        Add expense
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-card/40 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What — e.g. Hotel night"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40 sm:col-span-2"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="priv rounded-md border border-border/30 bg-card px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        >
          {SUGGESTED_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={estimated}
          onChange={(e) => setEstimated(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="Estimated"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={actual}
          onChange={(e) => setActual(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="Actual (optional)"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          placeholder="Paid by (optional)"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !label.trim()}
          className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function EditBudgetForm({ item, onClose }: { item: TripBudgetItem; onClose: () => void }) {
  const [label, setLabel] = useState(item.label);
  const [category, setCategory] = useState(item.category);
  const [estimated, setEstimated] = useState(item.estimated.toString());
  const [actual, setActual] = useState(item.actual?.toString() ?? "");
  const [paidBy, setPaidBy] = useState(item.paid_by ?? "");
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await updateBudgetItemAction(item._id, {
        trip_id: item.trip_id,
        label: label.trim() || item.label,
        category,
        estimated: estimated ? Number(estimated) : 0,
        actual: actual ? Number(actual) : null,
        paid_by: paidBy.trim() || null,
      });
      onClose();
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-card/40 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40 sm:col-span-2"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="priv rounded-md border border-border/30 bg-card px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        >
          {[...new Set([...SUGGESTED_CATEGORIES, category])].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={estimated}
          onChange={(e) => setEstimated(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="Estimated"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={actual}
          onChange={(e) => setActual(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="Actual"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          placeholder="Paid by"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
