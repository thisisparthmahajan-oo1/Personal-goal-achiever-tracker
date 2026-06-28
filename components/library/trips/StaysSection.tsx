"use client";

import { useState, useTransition } from "react";
import { BedDouble, ExternalLink, Pencil, Plane, Plus, Trash2, X } from "lucide-react";
import {
  createStayAction,
  updateStayAction,
  deleteStayAction,
} from "@/app/actions/trips";
import {
  formatDateShort,
  formatMoney,
  nightsBetween,
  toDateInputValue,
} from "@/lib/trip-helpers";
import type { TripStay, TripTransport } from "@/lib/schemas";
import { CollapsibleSection } from "@/components/library/trips/CollapsibleSection";
import {
  TransportRow,
  AddTransportForm,
} from "@/components/library/trips/TransportSection";

export function StaysSection({
  tripId,
  stays,
  legs,
  currency,
}: {
  tripId: string;
  stays: TripStay[];
  legs: TripTransport[];
  currency: string;
}) {
  const stayCost = stays.reduce((s, x) => s + (x.cost ?? 0), 0);
  const legCost = legs.reduce((s, x) => s + (x.cost ?? 0), 0);
  const totalCost = stayCost + legCost;
  const totalCount = stays.length + legs.length;

  return (
    <CollapsibleSection
      title="Flights and Stay"
      icon={<Plane className="size-3.5" />}
      badge={
        totalCount === 0
          ? "none"
          : `${legs.length}✈ · ${stays.length}🛏 · ${formatMoney(totalCost, currency)}`
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Plane className="size-3" /> Flights & transport
          </h3>
          {legs.map((l) => (
            <TransportRow key={l._id} leg={l} currency={currency} />
          ))}
          <AddTransportForm tripId={tripId} />
        </div>
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <BedDouble className="size-3" /> Stays
          </h3>
          {stays.map((s) => (
            <StayRow key={s._id} stay={s} currency={currency} />
          ))}
          <AddStayForm tripId={tripId} />
        </div>
      </div>
    </CollapsibleSection>
  );
}

function StayRow({ stay, currency }: { stay: TripStay; currency: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const n = nightsBetween(stay.check_in, stay.check_out);

  if (editing) {
    return <EditStayForm stay={stay} onClose={() => setEditing(false)} />;
  }
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-border/30 bg-card/40 p-3 transition-colors hover:bg-card/60">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <BedDouble className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          {stay.url ? (
            <a
              href={stay.url}
              target="_blank"
              rel="noopener noreferrer"
              className="priv inline-flex items-center gap-1 text-sm font-medium hover:text-primary"
            >
              {stay.name}
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="priv text-sm font-medium">{stay.name}</span>
          )}
          {stay.location && (
            <span className="priv text-[11px] text-muted-foreground">
              · {stay.location}
            </span>
          )}
        </div>
        <div className="priv mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {stay.check_in && stay.check_out && (
            <span>
              {formatDateShort(stay.check_in)} → {formatDateShort(stay.check_out)}
              {n !== null && ` · ${n}n`}
            </span>
          )}
          {stay.cost !== null && (
            <span className="font-mono">{formatMoney(stay.cost, currency)}</span>
          )}
          {stay.confirmation && (
            <span className="font-mono uppercase tracking-[0.12em] text-muted-foreground/70">
              {stay.confirmation}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          title="Edit"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${stay.name}"?`))
              startTransition(() => deleteStayAction(stay._id));
          }}
          disabled={pending}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function EditStayForm({ stay, onClose }: { stay: TripStay; onClose: () => void }) {
  const [name, setName] = useState(stay.name);
  const [location, setLocation] = useState(stay.location ?? "");
  const [checkIn, setCheckIn] = useState(toDateInputValue(stay.check_in));
  const [checkOut, setCheckOut] = useState(toDateInputValue(stay.check_out));
  const [url, setUrl] = useState(stay.url ?? "");
  const [confirmation, setConfirmation] = useState(stay.confirmation ?? "");
  const [cost, setCost] = useState(stay.cost?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await updateStayAction(stay._id, {
        name: name.trim() || stay.name,
        location: location.trim() || null,
        check_in: checkIn || null,
        check_out: checkOut || null,
        url: url.trim() || null,
        confirmation: confirmation.trim() || null,
        cost: cost ? Number(cost) : null,
      });
      onClose();
    });
  };

  return (
    <StayFormFields
      name={name} setName={setName}
      location={location} setLocation={setLocation}
      checkIn={checkIn} setCheckIn={setCheckIn}
      checkOut={checkOut} setCheckOut={setCheckOut}
      url={url} setUrl={setUrl}
      confirmation={confirmation} setConfirmation={setConfirmation}
      cost={cost} setCost={setCost}
      submitLabel="Save"
      onSubmit={save}
      onCancel={onClose}
      pending={pending}
    />
  );
}

function AddStayForm({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [url, setUrl] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [cost, setCost] = useState("");
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setName(""); setLocation(""); setCheckIn(""); setCheckOut("");
    setUrl(""); setConfirmation(""); setCost("");
  };

  const submit = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      await createStayAction({
        trip_id: tripId,
        name: name.trim(),
        location: location.trim() || null,
        check_in: checkIn || null,
        check_out: checkOut || null,
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
        Add stay
      </button>
    );
  }
  return (
    <StayFormFields
      name={name} setName={setName}
      location={location} setLocation={setLocation}
      checkIn={checkIn} setCheckIn={setCheckIn}
      checkOut={checkOut} setCheckOut={setCheckOut}
      url={url} setUrl={setUrl}
      confirmation={confirmation} setConfirmation={setConfirmation}
      cost={cost} setCost={setCost}
      submitLabel="Add"
      onSubmit={submit}
      onCancel={() => { reset(); setOpen(false); }}
      pending={pending}
    />
  );
}

function StayFormFields(props: {
  name: string; setName: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  checkIn: string; setCheckIn: (v: string) => void;
  checkOut: string; setCheckOut: (v: string) => void;
  url: string; setUrl: (v: string) => void;
  confirmation: string; setConfirmation: (v: string) => void;
  cost: string; setCost: (v: string) => void;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-card/40 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          autoFocus
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          placeholder="Name (e.g. Villa Sundara)"
          disabled={props.pending}
          maxLength={200}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={props.location}
          onChange={(e) => props.setLocation(e.target.value)}
          placeholder="Location (e.g. Ubud)"
          disabled={props.pending}
          maxLength={200}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          type="date"
          value={props.checkIn}
          onChange={(e) => props.setCheckIn(e.target.value)}
          placeholder="Check-in"
          disabled={props.pending}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          type="date"
          value={props.checkOut}
          onChange={(e) => props.setCheckOut(e.target.value)}
          placeholder="Check-out"
          disabled={props.pending}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={props.url}
          onChange={(e) => props.setUrl(e.target.value)}
          placeholder="Booking URL"
          disabled={props.pending}
          maxLength={1000}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={props.confirmation}
          onChange={(e) => props.setConfirmation(e.target.value)}
          placeholder="Confirmation #"
          disabled={props.pending}
          maxLength={200}
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={props.cost}
          onChange={(e) => props.setCost(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="Cost (₹)"
          inputMode="decimal"
          disabled={props.pending}
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
          disabled={props.pending || !props.name.trim()}
          className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
        >
          {props.submitLabel}
        </button>
      </div>
    </div>
  );
}
