"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Coffee,
  ExternalLink,
  GripVertical,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Soup,
  StickyNote,
  Trash2,
  Utensils,
  Waves,
  Wine,
} from "lucide-react";
import {
  createSectionAction,
  renameSectionAction,
  deleteSectionAction,
  reorderSectionsAction,
  createSectionItemAction,
  updateSectionItemAction,
  cycleSectionItemStatusAction,
  deleteSectionItemAction,
  createSpotAction,
  updateSpotAction,
  deleteSpotAction,
} from "@/app/actions/trip-sections";
import type {
  TripSection,
  TripSectionContentType,
  TripSectionItem,
  TripSectionItemStatus,
  TripSpot,
  SpotCategory,
  SpotPriority,
  MealTag,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/editor/RichEditor";
import { stripHtml } from "@/components/editor/plain-text";
import { daysUntil, formatDateShort, toDateInputValue } from "@/lib/trip-helpers";

const STATUS_LABELS: Record<TripSectionItemStatus, string> = {
  yet_to_start: "Yet to Start",
  in_review: "In Review",
  completed: "Completed",
};

const STATUS_STYLES: Record<TripSectionItemStatus, string> = {
  yet_to_start:
    "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50",
  in_review:
    "border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
  completed:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
};

const CATEGORY_LABELS: Record<SpotCategory, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  beach_club: "Beach Club",
  bar: "Bar",
  street_food: "Street Food",
  other: "Other",
};

const CATEGORY_ICONS: Record<SpotCategory, typeof Utensils> = {
  restaurant: Utensils,
  cafe: Coffee,
  beach_club: Waves,
  bar: Wine,
  street_food: Soup,
  other: MapPin,
};

const PRIORITY_LABELS: Record<SpotPriority, string> = {
  must_try: "Must-try",
  optional: "Optional",
};

const PRIORITY_STYLES: Record<SpotPriority, string> = {
  must_try: "border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
  optional: "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50",
};

const MEAL_LABELS: Record<MealTag, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const CATEGORY_ORDER: SpotCategory[] = [
  "restaurant",
  "cafe",
  "beach_club",
  "bar",
  "street_food",
  "other",
];
const PRIORITY_ORDER: SpotPriority[] = ["must_try", "optional"];
const MEAL_ORDER: MealTag[] = ["breakfast", "lunch", "dinner"];

function urlLabel(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "open";
  }
}

function dueTint(due: Date | null, done: boolean): string {
  if (!due)
    return "border-dashed border-border/40 text-muted-foreground/70 hover:border-primary/40 hover:text-foreground";
  if (done) return "border-border/30 bg-muted/10 text-muted-foreground/70";
  const d = daysUntil(due);
  if (d === null) return "border-border/40 bg-muted/20 text-muted-foreground";
  if (d < 0) return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  if (d <= 3) return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  return "border-border/40 bg-muted/20 text-muted-foreground";
}

function dueLabel(due: Date | null): string {
  if (!due) return "+ Due";
  const d = daysUntil(due);
  if (d === null) return formatDateShort(due);
  if (d < 0) return `${formatDateShort(due)} · ${-d}d late`;
  if (d === 0) return `${formatDateShort(due)} · today`;
  return `${formatDateShort(due)} · ${d}d`;
}

/** Drag-to-reorder state + handlers for a sibling id list, mirroring
 * components/todos/OpenTodosList.tsx's native-HTML5-drag pattern. */
function useDragOrder(ids: string[], onReorder: (next: string[]) => void) {
  const [order, setOrder] = useState<string[]>(ids);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const key = ids.join(",");

  useEffect(() => setOrder(ids), [key]);

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragOver = (id: string) => (e: React.DragEvent) => {
    if (!draggedId || draggedId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  };

  const onDragLeave = (id: string) => () => {
    if (overId === id) setOverId(null);
  };

  const onDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setOverId(null);
      return;
    }
    const next = order.filter((id) => id !== draggedId);
    const idx = next.indexOf(targetId);
    next.splice(idx, 0, draggedId);
    setOrder(next);
    setDraggedId(null);
    setOverId(null);
    onReorder(next);
  };

  const onDragEnd = () => {
    setDraggedId(null);
    setOverId(null);
  };

  return { order, draggedId, overId, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd };
}

export function SectionTree({
  tripId,
  sections,
  items,
  spots,
}: {
  tripId: string;
  sections: TripSection[];
  items: TripSectionItem[];
  spots: TripSpot[];
}) {
  const [, startTransition] = useTransition();
  const roots = sections.filter((s) => s.parent_id === null);
  const byId = new Map(roots.map((s) => [s._id, s] as const));
  const childrenOf = (parentId: string) =>
    sections.filter((s) => s.parent_id === parentId);
  const itemsOf = (sectionId: string) =>
    items.filter((i) => i.section_id === sectionId);
  const spotsOf = (sectionId: string) =>
    spots.filter((s) => s.section_id === sectionId);

  const drag = useDragOrder(
    roots.map((s) => s._id),
    (next) => startTransition(() => reorderSectionsAction(next, tripId))
  );

  return (
    <div className="space-y-4">
      {drag.order.map((id) => {
        const section = byId.get(id);
        if (!section) return null;
        return (
          <div
            key={id}
            draggable
            onDragStart={drag.onDragStart(id)}
            onDragOver={drag.onDragOver(id)}
            onDragLeave={drag.onDragLeave(id)}
            onDrop={drag.onDrop(id)}
            onDragEnd={drag.onDragEnd}
            className={cn(
              "relative transition-opacity",
              drag.draggedId === id && "opacity-40",
              drag.overId === id &&
                "before:absolute before:-top-2 before:left-0 before:right-0 before:h-0.5 before:rounded-full before:bg-primary"
            )}
          >
            <SectionNode
              tripId={tripId}
              section={section}
              subsections={childrenOf(section._id)}
              items={itemsOf(section._id)}
              spots={spotsOf(section._id)}
              allItemsBySection={itemsOf}
              allSpotsBySection={spotsOf}
            />
          </div>
        );
      })}
      <AddSectionInline tripId={tripId} parentId={null} />
    </div>
  );
}

function SectionNode({
  tripId,
  section,
  subsections,
  items,
  spots,
  allItemsBySection,
  allSpotsBySection,
}: {
  tripId: string;
  section: TripSection;
  subsections: TripSection[];
  items: TripSectionItem[];
  spots: TripSpot[];
  allItemsBySection: (sectionId: string) => TripSectionItem[];
  allSpotsBySection: (sectionId: string) => TripSpot[];
}) {
  const isSubsection = section.parent_id !== null;
  const isSpots = section.content_type === "spots";
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(section.name);
  const [addingSub, setAddingSub] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const subDrag = useDragOrder(
    subsections.map((s) => s._id),
    (next) => startTransition(() => reorderSectionsAction(next, tripId))
  );
  const subById = new Map(subsections.map((s) => [s._id, s] as const));

  useEffect(() => setDraft(section.name), [section.name]);
  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const commitRename = () => {
    const next = draft.trim();
    if (!next || next === section.name) {
      setDraft(section.name);
      setRenaming(false);
      return;
    }
    startTransition(async () => {
      await renameSectionAction(section._id, tripId, next);
      setRenaming(false);
    });
  };

  return (
    <div
      className={cn(
        "group rounded-2xl border border-border/40 bg-card/40 p-4",
        isSubsection && "border-border/30 bg-card/20"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          title="Drag to reorder"
          className="flex shrink-0 cursor-grab items-center text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground active:cursor-grabbing"
          aria-hidden
        >
          <GripVertical className="size-3.5" />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand" : "Collapse"}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
        <Layers className="size-3.5 shrink-0 text-muted-foreground" />
        {renaming ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(section.name);
                setRenaming(false);
              }
            }}
            disabled={pending}
            maxLength={200}
            className="priv min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
          />
        ) : (
          <h3
            className={cn(
              "priv min-w-0 flex-1 truncate font-semibold tracking-tight",
              isSubsection ? "text-sm" : "text-base"
            )}
          >
            {section.name}
          </h3>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setDraft(section.name);
              setRenaming(true);
            }}
            title="Rename"
            className="rounded p-1 text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground hover:opacity-100"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const msg = subsections.length
                ? `Delete "${section.name}" and its ${subsections.length} subsection(s) and all their items?`
                : `Delete "${section.name}" and its items?`;
              if (confirm(msg))
                startTransition(() => deleteSectionAction(section._id, tripId));
            }}
            disabled={pending}
            title="Delete"
            className="rounded p-1 text-muted-foreground opacity-60 transition-opacity hover:bg-destructive/20 hover:text-destructive hover:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && !isSpots && (
        <>
          {items.length > 0 && (
            <div className="mb-2 space-y-2">
              {items.map((item) => (
                <ItemRow key={item._id} tripId={tripId} item={item} />
              ))}
            </div>
          )}

          {addingItem ? (
            <AddItemInline
              tripId={tripId}
              sectionId={section._id}
              onDone={() => setAddingItem(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="mb-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3" />
              Add item
            </button>
          )}
        </>
      )}

      {!collapsed && isSpots && (
        <>
          {spots.length > 0 && (
            <div className="mb-2 space-y-2">
              {[...spots]
                .sort(
                  (a, b) =>
                    PRIORITY_ORDER.indexOf(a.priority) -
                      PRIORITY_ORDER.indexOf(b.priority) || a.sort_order - b.sort_order
                )
                .map((spot) => (
                  <SpotCard key={spot._id} tripId={tripId} spot={spot} />
                ))}
            </div>
          )}

          {addingItem ? (
            <AddSpotInline
              tripId={tripId}
              sectionId={section._id}
              onDone={() => setAddingItem(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="mb-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3" />
              Add spot
            </button>
          )}
        </>
      )}

      {!isSubsection && !collapsed && (
        <div className="mt-2 space-y-3 border-t border-border/30 pt-3">
          {subDrag.order.map((id) => {
            const sub = subById.get(id);
            if (!sub) return null;
            return (
              <div
                key={id}
                draggable
                onDragStart={subDrag.onDragStart(id)}
                onDragOver={subDrag.onDragOver(id)}
                onDragLeave={subDrag.onDragLeave(id)}
                onDrop={subDrag.onDrop(id)}
                onDragEnd={subDrag.onDragEnd}
                className={cn(
                  "relative transition-opacity",
                  subDrag.draggedId === id && "opacity-40",
                  subDrag.overId === id &&
                    "before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-0.5 before:rounded-full before:bg-primary"
                )}
              >
                <SectionNode
                  tripId={tripId}
                  section={sub}
                  subsections={[]}
                  items={allItemsBySection(sub._id)}
                  spots={allSpotsBySection(sub._id)}
                  allItemsBySection={allItemsBySection}
                  allSpotsBySection={allSpotsBySection}
                />
              </div>
            );
          })}
          {addingSub ? (
            <AddSectionInline
              tripId={tripId}
              parentId={section._id}
              onDone={() => setAddingSub(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingSub(true)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3" />
              Add subsection
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ tripId, item }: { tripId: string; item: TripSectionItem }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dueEditing, setDueEditing] = useState(false);
  const [dueDraft, setDueDraft] = useState(toDateInputValue(item.due_date));
  const dueRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(item.notes ?? "");
  const hasNotes = stripHtml(item.notes ?? "").trim().length > 0;

  useEffect(() => setDraft(item.name), [item.name]);
  useEffect(() => setDueDraft(toDateInputValue(item.due_date)), [item.due_date]);
  useEffect(() => setNotesDraft(item.notes ?? ""), [item.notes]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (dueEditing) dueRef.current?.focus();
  }, [dueEditing]);

  const commit = () => {
    const next = draft.trim();
    if (!next || next === item.name) {
      setDraft(item.name);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await updateSectionItemAction(item._id, tripId, { name: next });
      setEditing(false);
    });
  };

  const commitDue = () => {
    setDueEditing(false);
    const desired = dueDraft || null;
    const current = toDateInputValue(item.due_date) || null;
    if (desired === current) return;
    startTransition(() =>
      updateSectionItemAction(item._id, tripId, { due_date: desired })
    );
  };

  const clearDue = () => {
    setDueDraft("");
    setDueEditing(false);
    if (!item.due_date) return;
    startTransition(() =>
      updateSectionItemAction(item._id, tripId, { due_date: null })
    );
  };

  const commitNotes = (html: string) => {
    if ((html ?? "") === (item.notes ?? "")) return;
    setNotesDraft(html);
    startTransition(() =>
      updateSectionItemAction(item._id, tripId, { notes: html })
    );
  };

  const done = item.status === "completed";

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/30 bg-card/40 transition-colors hover:bg-card/60",
        expanded && "bg-card/60"
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(item.name);
                setEditing(false);
              }
            }}
            disabled={pending}
            maxLength={300}
            className="priv min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "priv min-w-0 flex-1 truncate text-left text-sm",
              done && "text-muted-foreground line-through decoration-muted-foreground/50"
            )}
            title="Click to expand notes"
          >
            {item.name}
          </button>
        )}

        {hasNotes && !expanded && (
          <StickyNote
            className="size-3.5 shrink-0 text-muted-foreground/60"
            aria-label="Has notes"
          />
        )}

        {dueEditing ? (
          <div className="flex shrink-0 items-center gap-1">
            <input
              ref={dueRef}
              type="date"
              value={dueDraft}
              onChange={(e) => setDueDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDue();
                if (e.key === "Escape") {
                  setDueDraft(toDateInputValue(item.due_date));
                  setDueEditing(false);
                }
              }}
              onBlur={commitDue}
              className="priv rounded-md border border-primary/40 bg-card/60 px-2 py-0.5 text-[11px] outline-none"
            />
            {item.due_date && (
              <button
                type="button"
                onClick={clearDue}
                title="Clear due date"
                className="rounded text-[11px] text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDueDraft(toDateInputValue(item.due_date));
              setDueEditing(true);
            }}
            title={item.due_date ? "Edit due date" : "Set due date"}
            className={cn(
              "priv inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors",
              dueTint(item.due_date, done)
            )}
          >
            <CalendarClock className="size-2.5" />
            {dueLabel(item.due_date)}
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            startTransition(() => cycleSectionItemStatusAction(item._id, tripId))
          }
          disabled={pending}
          title={`Status: ${STATUS_LABELS[item.status]} (click to cycle)`}
          className={cn(
            "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
            STATUS_STYLES[item.status],
            pending && "opacity-60"
          )}
        >
          {STATUS_LABELS[item.status]}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Hide notes" : hasNotes ? "Show notes" : "Add notes"}
            className={cn(
              "rounded p-1 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground",
              expanded || hasNotes ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(item.name);
              setEditing(true);
            }}
            disabled={pending}
            title="Edit name"
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${item.name}"?`))
                startTransition(() => deleteSectionItemAction(item._id, tripId));
            }}
            disabled={pending}
            title="Delete"
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/30 px-3 py-2">
          <RichEditor
            value={notesDraft}
            onChange={setNotesDraft}
            onBlur={commitNotes}
            placeholder="Notes — context, links, details…"
            compact
            autoFocus={!hasNotes}
          />
        </div>
      )}
    </div>
  );
}

function AddItemInline({
  tripId,
  sectionId,
  onDone,
}: {
  tripId: string;
  sectionId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      onDone();
      return;
    }
    startTransition(async () => {
      await createSectionItemAction({ trip_id: tripId, section_id: sectionId, name: trimmed });
      setName("");
      onDone();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="mb-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-card/40 px-3 py-2"
    >
      <Plus className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
        placeholder="Item name"
        disabled={pending}
        maxLength={300}
        className="priv min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </form>
  );
}

function SpotCard({ tripId, spot }: { tripId: string; spot: TripSpot }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(spot.name);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(spot.notes ?? "");
  const hasNotes = stripHtml(spot.notes ?? "").trim().length > 0;

  const [dishesEditing, setDishesEditing] = useState(false);
  const [dishesDraft, setDishesDraft] = useState(spot.dishes ?? "");
  const dishesRef = useRef<HTMLInputElement>(null);

  const [linkEditing, setLinkEditing] = useState(false);
  const [linkDraft, setLinkDraft] = useState(spot.link ?? "");
  const linkRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(spot.name), [spot.name]);
  useEffect(() => setNotesDraft(spot.notes ?? ""), [spot.notes]);
  useEffect(() => setDishesDraft(spot.dishes ?? ""), [spot.dishes]);
  useEffect(() => setLinkDraft(spot.link ?? ""), [spot.link]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);
  useEffect(() => {
    if (dishesEditing) dishesRef.current?.focus();
  }, [dishesEditing]);
  useEffect(() => {
    if (linkEditing) linkRef.current?.focus();
  }, [linkEditing]);

  const Icon = CATEGORY_ICONS[spot.category];

  const commitName = () => {
    const next = draft.trim();
    if (!next || next === spot.name) {
      setDraft(spot.name);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await updateSpotAction(spot._id, tripId, { name: next });
      setEditing(false);
    });
  };

  const commitDishes = () => {
    setDishesEditing(false);
    const next = dishesDraft.trim() || null;
    if ((next ?? "") === (spot.dishes ?? "")) return;
    startTransition(() => updateSpotAction(spot._id, tripId, { dishes: next }));
  };

  const commitLink = () => {
    setLinkEditing(false);
    const next = linkDraft.trim() || null;
    if ((next ?? "") === (spot.link ?? "")) return;
    startTransition(() => updateSpotAction(spot._id, tripId, { link: next }));
  };

  const commitNotes = (html: string) => {
    if ((html ?? "") === (spot.notes ?? "")) return;
    setNotesDraft(html);
    startTransition(() => updateSpotAction(spot._id, tripId, { notes: html }));
  };

  const toggleMeal = (meal: MealTag) => {
    const has = spot.meal_tags.includes(meal);
    const next = has
      ? spot.meal_tags.filter((m) => m !== meal)
      : [...spot.meal_tags, meal];
    startTransition(() => updateSpotAction(spot._id, tripId, { meal_tags: next }));
  };

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/30 bg-card/40 transition-colors hover:bg-card/60",
        expanded && "bg-card/60"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setDraft(spot.name);
                setEditing(false);
              }
            }}
            disabled={pending}
            maxLength={200}
            className="priv min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(spot.name);
              setEditing(true);
            }}
            className="priv min-w-0 flex-1 truncate text-left text-sm font-medium"
            title="Click to rename"
          >
            {spot.name}
          </button>
        )}

        <select
          value={spot.category}
          onChange={(e) =>
            startTransition(() =>
              updateSpotAction(spot._id, tripId, {
                category: e.target.value as SpotCategory,
              })
            )
          }
          className="priv shrink-0 rounded-md border border-border/40 bg-card/30 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground outline-none"
        >
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() =>
            startTransition(() =>
              updateSpotAction(spot._id, tripId, {
                priority: spot.priority === "must_try" ? "optional" : "must_try",
              })
            )
          }
          disabled={pending}
          title="Click to toggle priority"
          className={cn(
            "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
            PRIORITY_STYLES[spot.priority],
            pending && "opacity-60"
          )}
        >
          {PRIORITY_LABELS[spot.priority]}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Hide notes" : hasNotes ? "Show notes" : "Add notes"}
            className={cn(
              "rounded p-1 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground",
              expanded || hasNotes ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${spot.name}"?`))
                startTransition(() => deleteSpotAction(spot._id, tripId));
            }}
            disabled={pending}
            title="Delete"
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
        {MEAL_ORDER.map((meal) => {
          const active = spot.meal_tags.includes(meal);
          return (
            <button
              key={meal}
              type="button"
              onClick={() => toggleMeal(meal)}
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
                active
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-dashed border-border/40 text-muted-foreground/60 hover:text-foreground"
              )}
            >
              {MEAL_LABELS[meal]}
            </button>
          );
        })}

        {dishesEditing ? (
          <input
            ref={dishesRef}
            value={dishesDraft}
            onChange={(e) => setDishesDraft(e.target.value)}
            onBlur={commitDishes}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDishes();
              if (e.key === "Escape") {
                setDishesDraft(spot.dishes ?? "");
                setDishesEditing(false);
              }
            }}
            placeholder="What to try — e.g. Nasi goreng, es kelapa"
            maxLength={300}
            className="priv min-w-[220px] flex-1 rounded-md border border-primary/40 bg-card/60 px-2 py-0.5 text-[11px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setDishesEditing(true)}
            className="priv truncate text-[11px] text-muted-foreground hover:text-foreground"
          >
            {spot.dishes || "+ What to try"}
          </button>
        )}

        {linkEditing ? (
          <input
            ref={linkRef}
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onBlur={commitLink}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLink();
              if (e.key === "Escape") {
                setLinkDraft(spot.link ?? "");
                setLinkEditing(false);
              }
            }}
            placeholder="https://maps.google.com/…"
            className="priv min-w-[180px] rounded-md border border-primary/40 bg-card/60 px-2 py-0.5 text-[11px] outline-none"
          />
        ) : spot.link ? (
          <a
            href={spot.link}
            target="_blank"
            rel="noopener noreferrer"
            title={spot.link}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/20"
          >
            <ExternalLink className="size-2.5" />
            {urlLabel(spot.link)}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setLinkEditing(true)}
            className="text-[11px] text-muted-foreground/60 hover:text-foreground"
          >
            + Link
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border/30 px-3 py-2">
          <RichEditor
            value={notesDraft}
            onChange={setNotesDraft}
            onBlur={commitNotes}
            placeholder="Notes — vibe, price range, tips…"
            compact
            autoFocus={!hasNotes}
          />
        </div>
      )}
    </div>
  );
}

function AddSpotInline({
  tripId,
  sectionId,
  onDone,
}: {
  tripId: string;
  sectionId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      onDone();
      return;
    }
    startTransition(async () => {
      await createSpotAction({ trip_id: tripId, section_id: sectionId, name: trimmed });
      setName("");
      onDone();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="mb-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-card/40 px-3 py-2"
    >
      <Plus className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
        placeholder="Place name — e.g. Sundara Beach Club"
        disabled={pending}
        maxLength={200}
        className="priv min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </form>
  );
}

function AddSectionInline({
  tripId,
  parentId,
  onDone,
}: {
  tripId: string;
  parentId: string | null;
  onDone?: () => void;
}) {
  const [name, setName] = useState("");
  const [contentType, setContentType] = useState<TripSectionContentType>("tasks");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (parentId) inputRef.current?.focus();
  }, [parentId]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      onDone?.();
      return;
    }
    startTransition(async () => {
      await createSectionAction({
        trip_id: tripId,
        name: trimmed,
        parent_id: parentId,
        content_type: parentId ? contentType : undefined,
      });
      setName("");
      onDone?.();
    });
  };

  if (parentId) {
    return (
      <form
        onSubmit={submit}
        className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card/40 px-3 py-2"
      >
        <Plus className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onDone?.();
          }}
          placeholder="Subsection name"
          disabled={pending}
          maxLength={200}
          className="priv min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <div className="flex shrink-0 items-center gap-1">
          {(["tasks", "spots"] as const).map((ct) => (
            <button
              key={ct}
              type="button"
              onClick={() => setContentType(ct)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
                contentType === ct
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground"
              )}
            >
              {ct === "tasks" ? "Tasks" : "Food spots"}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Add
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-2xl border border-dashed border-border/40 bg-card/20 px-4 py-3"
    >
      <Plus className="size-4 shrink-0 text-muted-foreground" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setName("");
        }}
        placeholder="Add a top-level section — e.g. Formalities, Bookings"
        disabled={pending}
        maxLength={200}
        className="priv min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
      >
        <Plus className="size-3" />
        Add
      </button>
    </form>
  );
}
