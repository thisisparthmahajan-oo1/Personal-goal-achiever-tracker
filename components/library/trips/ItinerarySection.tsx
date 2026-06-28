"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  ExternalLink,
  Flame,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
  Waves,
  X,
} from "lucide-react";
import {
  createActivityAction,
  updateActivityAction,
  cycleActivityStatusAction,
  deleteActivityAction,
} from "@/app/actions/trips";
import {
  formatDateFull,
  formatMoney,
  tripDays,
} from "@/lib/trip-helpers";
import type {
  ActivityCategory,
  ActivityStatus,
  Trip,
  TripActivity,
} from "@/lib/schemas";
import { CollapsibleSection } from "@/components/library/trips/CollapsibleSection";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; tint: string; Icon: typeof MapPin }
> = {
  sight: { label: "Sight", tint: "border-sky-500/30 bg-sky-500/10 text-sky-200", Icon: MapPin },
  food: { label: "Food", tint: "border-orange-500/30 bg-orange-500/10 text-orange-200", Icon: Utensils },
  beach: { label: "Beach", tint: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200", Icon: Waves },
  adventure: { label: "Adventure", tint: "border-rose-500/30 bg-rose-500/10 text-rose-200", Icon: Flame },
  shopping: { label: "Shopping", tint: "border-pink-500/30 bg-pink-500/10 text-pink-200", Icon: Sparkles },
  wellness: { label: "Wellness", tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200", Icon: Sparkles },
  other: { label: "Other", tint: "border-border/40 bg-muted/20 text-muted-foreground", Icon: MapPin },
};

const CATEGORIES: ActivityCategory[] = [
  "sight",
  "food",
  "beach",
  "adventure",
  "shopping",
  "wellness",
  "other",
];

const STATUS_LABEL: Record<ActivityStatus, string> = {
  wishlist: "Wishlist",
  booked: "Booked",
  done: "Done",
};
const STATUS_STYLE: Record<ActivityStatus, string> = {
  wishlist: "border-border/40 bg-muted/20 text-muted-foreground",
  booked: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  done: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

export function ItinerarySection({
  trip,
  activities,
  currency,
}: {
  trip: Trip;
  activities: TripActivity[];
  currency: string;
}) {
  const days = tripDays(trip.start_date, trip.end_date);
  const scheduled = activities.filter((a) => a.day_index !== null);
  const wishlist = activities.filter((a) => a.day_index === null);

  return (
    <CollapsibleSection
      title="Itinerary"
      icon={<CalendarDays className="size-3.5" />}
      badge={
        activities.length === 0
          ? "empty"
          : `${scheduled.length} planned · ${wishlist.length} wishlist`
      }
    >
      <div className="space-y-4">
        {days.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Add trip dates above to lay out a day-by-day plan.
          </p>
        ) : (
          <div className="space-y-3">
            {days.map((d) => (
              <DayBlock
                key={d.index}
                tripId={trip._id}
                dayIndex={d.index}
                date={d.date}
                activities={scheduled.filter((a) => a.day_index === d.index)}
                currency={currency}
              />
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border/30 bg-card/20 p-3">
          <h3 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Wishlist · {wishlist.length}
          </h3>
          <div className="space-y-2">
            {wishlist.map((a) => (
              <ActivityRow key={a._id} activity={a} currency={currency} />
            ))}
            <AddActivityForm tripId={trip._id} dayIndex={null} dayCount={days.length} />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function DayBlock({
  tripId,
  dayIndex,
  date,
  activities,
  currency,
}: {
  tripId: string;
  dayIndex: number;
  date: Date;
  activities: TripActivity[];
  currency: string;
}) {
  // Sort by time within the day, items without time at the end
  const sorted = [...activities].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.sort_order - b.sort_order;
  });
  return (
    <div className="rounded-xl border border-border/30 bg-card/30 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="priv text-sm font-semibold">
          Day {dayIndex + 1}
          <span className="ml-2 font-normal text-muted-foreground">
            · {formatDateFull(date)}
          </span>
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
          {sorted.length} {sorted.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="space-y-2">
        {sorted.map((a) => (
          <ActivityRow key={a._id} activity={a} currency={currency} />
        ))}
        <AddActivityForm tripId={tripId} dayIndex={dayIndex} dayCount={null} compact />
      </div>
    </div>
  );
}

function ActivityRow({
  activity,
  currency,
}: {
  activity: TripActivity;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const meta = CATEGORY_META[activity.category];
  if (editing) {
    return <EditActivityForm activity={activity} onClose={() => setEditing(false)} />;
  }
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border/30 bg-card/40 px-3 py-2 hover:bg-card/60">
      <div
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border",
          meta.tint
        )}
        title={meta.label}
      >
        <meta.Icon className="size-3" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          {activity.time && (
            <span className="font-mono text-[11px] text-muted-foreground/80">
              {activity.time}
            </span>
          )}
          <span
            className={cn(
              "priv text-sm",
              activity.status === "done" &&
                "text-muted-foreground line-through decoration-muted-foreground/50"
            )}
          >
            {activity.name}
          </span>
          {activity.url && (
            <a
              href={activity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
              title="Open"
            >
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <div className="priv flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {activity.location && <span>{activity.location}</span>}
          {activity.cost !== null && (
            <span className="font-mono">{formatMoney(activity.cost, currency)}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => startTransition(() => cycleActivityStatusAction(activity._id))}
        title={`Status: ${STATUS_LABEL[activity.status]} (click to cycle)`}
        className={cn(
          "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em]",
          STATUS_STYLE[activity.status]
        )}
      >
        {STATUS_LABEL[activity.status]}
      </button>
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
            if (confirm(`Delete "${activity.name}"?`))
              startTransition(() => deleteActivityAction(activity._id));
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

function AddActivityForm({
  tripId,
  dayIndex,
  dayCount,
  compact = false,
}: {
  tripId: string;
  dayIndex: number | null;
  dayCount: number | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cat, setCat] = useState<ActivityCategory>("other");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [cost, setCost] = useState("");
  const [day, setDay] = useState<number | null>(dayIndex);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      await createActivityAction({
        trip_id: tripId,
        name: name.trim(),
        category: cat,
        day_index: day,
        time: time.trim() || null,
        location: location.trim() || null,
        url: url.trim() || null,
        cost: cost ? Number(cost) : null,
      });
      setName(""); setCat("other"); setTime(""); setLocation(""); setUrl(""); setCost("");
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/40 px-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-foreground " +
          (compact ? "py-1.5" : "py-2")
        }
      >
        <Plus className="size-3" />
        Add {dayIndex !== null ? "activity" : "to wishlist"}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-card/40 p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="What — e.g. Sunrise at Mount Batur"
        maxLength={300}
        className="priv w-full rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
      />
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((c) => {
          const m = CATEGORY_META[c];
          return (
            <button
              type="button"
              key={c}
              onClick={() => setCat(c)}
              className={
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] " +
                (cat === c ? m.tint : "border-border/40 text-muted-foreground hover:text-foreground")
              }
            >
              <m.Icon className="size-2.5" />
              {m.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="Time (e.g. 9:00 AM)"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL / map link"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="Cost (₹)"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
      </div>
      {dayCount !== null && dayCount > 0 && (
        <select
          value={day === null ? "" : String(day)}
          onChange={(e) =>
            setDay(e.target.value === "" ? null : Number(e.target.value))
          }
          className="priv w-full rounded-md border border-border/30 bg-card px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        >
          <option value="">Wishlist (unscheduled)</option>
          {Array.from({ length: dayCount }).map((_, i) => (
            <option key={i} value={String(i)}>
              Day {i + 1}
            </option>
          ))}
        </select>
      )}
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
          disabled={pending || !name.trim()}
          className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function EditActivityForm({
  activity,
  onClose,
}: {
  activity: TripActivity;
  onClose: () => void;
}) {
  const [name, setName] = useState(activity.name);
  const [cat, setCat] = useState<ActivityCategory>(activity.category);
  const [time, setTime] = useState(activity.time ?? "");
  const [location, setLocation] = useState(activity.location ?? "");
  const [url, setUrl] = useState(activity.url ?? "");
  const [cost, setCost] = useState(activity.cost?.toString() ?? "");
  const [day, setDay] = useState<number | null>(activity.day_index);
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await updateActivityAction(activity._id, {
        name: name.trim() || activity.name,
        category: cat,
        day_index: day,
        time: time.trim() || null,
        location: location.trim() || null,
        url: url.trim() || null,
        cost: cost ? Number(cost) : null,
      });
      onClose();
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-card/40 p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Activity name"
        maxLength={300}
        className="priv w-full rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
      />
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((c) => {
          const m = CATEGORY_META[c];
          return (
            <button
              type="button"
              key={c}
              onClick={() => setCat(c)}
              className={
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] " +
                (cat === c ? m.tint : "border-border/40 text-muted-foreground hover:text-foreground")
              }
            >
              <m.Icon className="size-2.5" />
              {m.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="Time"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL"
          className="priv rounded-md border border-border/30 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary/40"
        />
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="Cost (₹)"
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
