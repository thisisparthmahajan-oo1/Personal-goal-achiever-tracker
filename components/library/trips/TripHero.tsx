"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { updateTripAction, deleteTripAction } from "@/app/actions/trips";
import { daysUntil, nightsBetween, formatDateShort, toDateInputValue } from "@/lib/trip-helpers";
import type { Trip } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function TripHero({ trip }: { trip: Trip }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => setTitle(trip.title), [trip.title]);
  useEffect(() => {
    if (editingTitle) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [editingTitle]);

  const [editingDest, setEditingDest] = useState(false);
  const [dest, setDest] = useState(trip.destination ?? "");
  useEffect(() => setDest(trip.destination ?? ""), [trip.destination]);

  const [editingDates, setEditingDates] = useState(false);
  const [startStr, setStartStr] = useState(toDateInputValue(trip.start_date));
  const [endStr, setEndStr] = useState(toDateInputValue(trip.end_date));
  useEffect(() => {
    setStartStr(toDateInputValue(trip.start_date));
    setEndStr(toDateInputValue(trip.end_date));
  }, [trip.start_date, trip.end_date]);

  const [travelerDraft, setTravelerDraft] = useState("");

  const [editingEmoji, setEditingEmoji] = useState(false);
  const [emoji, setEmoji] = useState(trip.cover_emoji ?? "");
  useEffect(() => setEmoji(trip.cover_emoji ?? ""), [trip.cover_emoji]);

  const commitTitle = () => {
    const next = title.trim();
    if (!next || next === trip.title) {
      setTitle(trip.title);
      setEditingTitle(false);
      return;
    }
    startTransition(async () => {
      await updateTripAction(trip._id, { title: next });
      setEditingTitle(false);
    });
  };

  const commitDest = () => {
    const next = dest.trim();
    if (next === (trip.destination ?? "")) {
      setEditingDest(false);
      return;
    }
    startTransition(async () => {
      await updateTripAction(trip._id, { destination: next || null });
      setEditingDest(false);
    });
  };

  const commitDates = () => {
    startTransition(async () => {
      await updateTripAction(trip._id, {
        start_date: startStr || null,
        end_date: endStr || null,
      });
      setEditingDates(false);
    });
  };

  const addTraveler = () => {
    const t = travelerDraft.trim();
    if (!t) return;
    if (trip.travelers.includes(t)) {
      setTravelerDraft("");
      return;
    }
    startTransition(async () => {
      await updateTripAction(trip._id, { travelers: [...trip.travelers, t] });
      setTravelerDraft("");
    });
  };

  const removeTraveler = (name: string) => {
    startTransition(() =>
      updateTripAction(trip._id, {
        travelers: trip.travelers.filter((t) => t !== name),
      })
    );
  };

  const commitEmoji = () => {
    const next = emoji.trim();
    if (next === (trip.cover_emoji ?? "")) {
      setEditingEmoji(false);
      return;
    }
    startTransition(async () => {
      await updateTripAction(trip._id, { cover_emoji: next || null });
      setEditingEmoji(false);
    });
  };

  const nights = nightsBetween(trip.start_date, trip.end_date);
  const dUntil = daysUntil(trip.start_date);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        {/* Cover emoji */}
        <button
          type="button"
          onClick={() => setEditingEmoji(true)}
          title="Trip emoji"
          className="priv flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-card/60 text-3xl hover:border-primary/40"
        >
          {editingEmoji ? (
            <input
              autoFocus
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              onBlur={commitEmoji}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEmoji();
                if (e.key === "Escape") {
                  setEmoji(trip.cover_emoji ?? "");
                  setEditingEmoji(false);
                }
              }}
              maxLength={4}
              className="w-full bg-transparent text-center text-3xl outline-none"
            />
          ) : (
            <span>{trip.cover_emoji || "🌴"}</span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitle(trip.title);
                  setEditingTitle(false);
                }
              }}
              maxLength={200}
              className="priv w-full bg-transparent text-4xl font-semibold tracking-tight outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="priv group flex items-baseline gap-2 text-left"
            >
              <h1 className="text-4xl font-semibold tracking-tight">{trip.title}</h1>
              <Pencil className="size-3.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}

          {/* Destination */}
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {editingDest ? (
              <input
                autoFocus
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                onBlur={commitDest}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitDest();
                  if (e.key === "Escape") {
                    setDest(trip.destination ?? "");
                    setEditingDest(false);
                  }
                }}
                maxLength={200}
                placeholder="Destination"
                className="priv min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingDest(true)}
                className="priv hover:text-foreground"
              >
                {trip.destination || (
                  <span className="text-muted-foreground/50">+ Add destination</span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  `Delete "${trip.title}" and all of its data? This cannot be undone.`
                )
              )
                startTransition(async () => {
                  await deleteTripAction(trip._id);
                  router.push("/library/trips");
                });
            }}
            disabled={pending}
            title="Delete trip"
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Dates + countdown */}
      <div className="flex flex-wrap items-center gap-3 text-[12px]">
        <div className="flex items-center gap-2 rounded-md border border-border/40 bg-card/40 px-2.5 py-1.5">
          <Calendar className="size-3.5 text-muted-foreground" />
          {editingDates ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                className="priv bg-transparent text-[12px] outline-none"
              />
              <span className="text-muted-foreground">→</span>
              <input
                type="date"
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                className="priv bg-transparent text-[12px] outline-none"
              />
              <button
                type="button"
                onClick={commitDates}
                className="rounded px-2 py-0.5 text-[11px] text-primary hover:bg-primary/10"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartStr(toDateInputValue(trip.start_date));
                  setEndStr(toDateInputValue(trip.end_date));
                  setEditingDates(false);
                }}
                className="rounded px-1 py-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDates(true)}
              className="priv text-left hover:text-foreground"
            >
              {trip.start_date && trip.end_date ? (
                <span>
                  {formatDateShort(trip.start_date)} → {formatDateShort(trip.end_date)}
                </span>
              ) : (
                <span className="text-muted-foreground/60">+ Add dates</span>
              )}
            </button>
          )}
        </div>

        {nights !== null && (
          <span className="rounded-md border border-border/30 bg-muted/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {nights} night{nights === 1 ? "" : "s"}
          </span>
        )}

        {dUntil !== null && (
          <span
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
              dUntil < 0
                ? "border-muted/40 bg-muted/15 text-muted-foreground"
                : dUntil <= 14
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/40 bg-muted/15 text-muted-foreground"
            )}
          >
            {dUntil < 0
              ? `${-dUntil}d ago`
              : dUntil === 0
                ? "Today"
                : `${dUntil}d to go`}
          </span>
        )}
      </div>

      {/* Travelers */}
      <div className="flex flex-wrap items-center gap-2">
        <Users className="size-3.5 text-muted-foreground" />
        {trip.travelers.length === 0 ? (
          <span className="text-[11px] text-muted-foreground/60">No travelers yet —</span>
        ) : (
          trip.travelers.map((t) => (
            <span
              key={t}
              className="priv inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] text-purple-200"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTraveler(t)}
                disabled={pending}
                title="Remove"
                className="rounded text-purple-300/70 hover:text-purple-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTraveler();
          }}
          className="inline-flex"
        >
          <input
            value={travelerDraft}
            onChange={(e) => setTravelerDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setTravelerDraft("");
            }}
            placeholder="+ Add traveler"
            disabled={pending}
            maxLength={80}
            className="priv w-32 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/50"
          />
        </form>
      </div>
    </div>
  );
}
