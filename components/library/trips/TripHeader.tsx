"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { updateTripAction, deleteTripAction } from "@/app/actions/trips";
import type { Trip } from "@/lib/schemas";

export function TripHeader({ trip }: { trip: Trip }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => setTitle(trip.title), [trip.title]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = title.trim();
    if (!next || next === trip.title) {
      setTitle(trip.title);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await updateTripAction(trip._id, { title: next });
      setEditing(false);
    });
  };

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setTitle(trip.title);
                setEditing(false);
              }
            }}
            disabled={pending}
            maxLength={200}
            className="priv w-full bg-transparent text-4xl font-semibold tracking-tight outline-none"
          />
        ) : (
          <h1 className="priv text-4xl font-semibold tracking-tight">
            {trip.title}
          </h1>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 pt-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          title="Rename trip"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                `Delete "${trip.title}" and all of its items? This cannot be undone.`
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
  );
}
