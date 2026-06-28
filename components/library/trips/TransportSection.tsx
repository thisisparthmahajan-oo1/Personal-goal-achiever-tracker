"use client";

import { useState, useTransition } from "react";
import {
  Car,
  ExternalLink,
  Pencil,
  Plane,
  Plus,
  Sailboat,
  Trash2,
  Train,
  X,
} from "lucide-react";
import {
  createTransportAction,
  updateTransportAction,
  deleteTransportAction,
} from "@/app/actions/trips";
import {
  formatDateShort,
  formatMoney,
  formatTime,
  toDateTimeInputValue,
} from "@/lib/trip-helpers";
import type { TransportMode, TripTransport } from "@/lib/schemas";
import { CollapsibleSection } from "@/components/library/trips/CollapsibleSection";

const MODES: { value: TransportMode; label: string }[] = [
  { value: "flight", label: "Flight" },
  { value: "boat", label: "Boat" },
  { value: "train", label: "Train" },
  { value: "car", label: "Car" },
  { value: "transfer", label: "Transfer" },
  { value: "other", label: "Other" },
];

function ModeIcon({ mode, className }: { mode: TransportMode; className?: string }) {
  if (mode === "flight") return <Plane className={className} />;
  if (mode === "boat") return <Sailboat className={className} />;
  if (mode === "train") return <Train className={className} />;
  return <Car className={className} />;
}

export function TransportSection({
  tripId,
  legs,
  currency,
}: {
  tripId: string;
  legs: TripTransport[];
  currency: string;
}) {
  const total = legs.reduce((s, x) => s + (x.cost ?? 0), 0);
  return (
    <CollapsibleSection
      title="Transport"
      icon={<Plane className="size-3.5" />}
      badge={
        legs.length === 0
          ? "none"
          : `${legs.length} · ${formatMoney(total, currency)}`
      }
    >
      <div className="space-y-2">
        {legs.map((l) => (
          <TransportRow key={l._id} leg={l} currency={currency} />
        ))}
        <AddTransportForm tripId={tripId} />
      </div>
    </CollapsibleSection>
  );
}

export function TransportRow({ leg, currency }: { leg: TripTransport; currency: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  if (editing) return <EditTransportForm leg={leg} onClose={() => setEditing(false)} />;
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-border/30 bg-card/40 p-3 hover:bg-card/60">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <ModeIcon mode={leg.mode} className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="priv text-sm font-medium">
            {leg.from_loc || "—"} <span className="text-muted-foreground">→</span>{" "}
            {leg.to_loc || "—"}
          </span>
          {leg.provider && (
            <span className="priv text-[11px] text-muted-foreground">· {leg.provider}</span>
          )}
          {leg.url && (
            <a
              href={leg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
              title="Open"
            >
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <div className="priv mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {leg.depart_at && (
            <span>
              {formatDateShort(leg.depart_at)} · {formatTime(leg.depart_at)}
              {leg.arrive_at && ` → ${formatTime(leg.arrive_at)}`}
            </span>
          )}
          {leg.ref && (
            <span className="font-mono uppercase tracking-[0.12em] text-muted-foreground/70">
              {leg.ref}
            </span>
          )}
          {leg.cost !== null && (
            <span className="font-mono">{formatMoney(leg.cost, currency)}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this leg?"))
              startTransition(() => deleteTransportAction(leg._id));
          }}
          disabled={pending}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AddTransportForm({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TransportMode>("flight");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [depart, setDepart] = useState("");
  const [arrive, setArrive] = useState("");
  const [provider, setProvider] = useState("");
  const [ref, setRef] = useState("");
  const [url, setUrl] = useState("");
  const [cost, setCost] = useState("");
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setMode("flight"); setFrom(""); setTo(""); setDepart(""); setArrive("");
    setProvider(""); setRef(""); setUrl(""); setCost("");
  };

  const submit = () => {
    startTransition(async () => {
      await createTransportAction({
        trip_id: tripId,
        mode,
        from_loc: from.trim() || null,
        to_loc: to.trim() || null,
        depart_at: depart || null,
        arrive_at: arrive || null,
        provider: provider.trim() || null,
        ref: ref.trim() || null,
        url: url.trim() || null,
        cost: cost ? Number(cost) : null,
      });
      reset();
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
        Add leg
      </button>
    );
  }
  return (
    <TransportFormFields
      mode={mode} setMode={setMode}
      from={from} setFrom={setFrom}
      to={to} setTo={setTo}
      depart={depart} setDepart={setDepart}
      arrive={arrive} setArrive={setArrive}
      provider={provider} setProvider={setProvider}
      ref_={ref} setRef={setRef}
      url={url} setUrl={setUrl}
      cost={cost} setCost={setCost}
      submitLabel="Add"
      onSubmit={submit}
      onCancel={() => { reset(); setOpen(false); }}
      pending={pending}
    />
  );
}

function EditTransportForm({
  leg,
  onClose,
}: {
  leg: TripTransport;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<TransportMode>(leg.mode);
  const [from, setFrom] = useState(leg.from_loc ?? "");
  const [to, setTo] = useState(leg.to_loc ?? "");
  const [depart, setDepart] = useState(toDateTimeInputValue(leg.depart_at));
  const [arrive, setArrive] = useState(toDateTimeInputValue(leg.arrive_at));
  const [provider, setProvider] = useState(leg.provider ?? "");
  const [ref, setRef] = useState(leg.ref ?? "");
  const [url, setUrl] = useState(leg.url ?? "");
  const [cost, setCost] = useState(leg.cost?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      await updateTransportAction(leg._id, {
        mode,
        from_loc: from.trim() || null,
        to_loc: to.trim() || null,
        depart_at: depart || null,
        arrive_at: arrive || null,
        provider: provider.trim() || null,
        ref: ref.trim() || null,
        url: url.trim() || null,
        cost: cost ? Number(cost) : null,
      });
      onClose();
    });
  };

  return (
    <TransportFormFields
      mode={mode} setMode={setMode}
      from={from} setFrom={setFrom}
      to={to} setTo={setTo}
      depart={depart} setDepart={setDepart}
      arrive={arrive} setArrive={setArrive}
      provider={provider} setProvider={setProvider}
      ref_={ref} setRef={setRef}
      url={url} setUrl={setUrl}
      cost={cost} setCost={setCost}
      submitLabel="Save"
      onSubmit={submit}
      onCancel={onClose}
      pending={pending}
    />
  );
}

function TransportFormFields(props: {
  mode: TransportMode; setMode: (m: TransportMode) => void;
  from: string; setFrom: (v: string) => void;
  to: string; setTo: (v: string) => void;
  depart: string; setDepart: (v: string) => void;
  arrive: string; setArrive: (v: string) => void;
  provider: string; setProvider: (v: string) => void;
  ref_: string; setRef: (v: string) => void;
  url: string; setUrl: (v: string) => void;
  cost: string; setCost: (v: string) => void;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-card/40 p-3">
      <div className="flex flex-wrap gap-1">
        {MODES.map((m) => (
          <button
            type="button"
            key={m.value}
            onClick={() => props.setMode(m.value)}
            className={
              "rounded-md border px-2 py-0.5 text-[11px] " +
              (props.mode === m.value
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border/40 text-muted-foreground hover:text-foreground")
            }
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          autoFocus
          value={props.from}
          onChange={(e) => props.setFrom(e.target.value)}
          placeholder="From (e.g. DEL)"
          maxLength={200}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={props.to}
          onChange={(e) => props.setTo(e.target.value)}
          placeholder="To (e.g. DPS / Gili Trawangan)"
          maxLength={200}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          type="datetime-local"
          value={props.depart}
          onChange={(e) => props.setDepart(e.target.value)}
          placeholder="Departs"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          type="datetime-local"
          value={props.arrive}
          onChange={(e) => props.setArrive(e.target.value)}
          placeholder="Arrives"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={props.provider}
          onChange={(e) => props.setProvider(e.target.value)}
          placeholder="Provider (Singapore Air, Bluewater Express…)"
          maxLength={200}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={props.ref_}
          onChange={(e) => props.setRef(e.target.value)}
          placeholder="PNR / booking ref"
          maxLength={200}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={props.url}
          onChange={(e) => props.setUrl(e.target.value)}
          placeholder="Booking URL"
          maxLength={1000}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={props.cost}
          onChange={(e) => props.setCost(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="Cost (₹)"
          inputMode="decimal"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          disabled={props.pending}
          className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
        <button
          type="button"
          onClick={props.onSubmit}
          disabled={props.pending}
          className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
        >
          {props.submitLabel}
        </button>
      </div>
    </div>
  );
}
