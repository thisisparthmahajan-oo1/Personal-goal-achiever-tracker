"use client";

import { useEffect, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { TodoRow } from "@/components/todos/TodoRow";
import { reorderTodosAction } from "@/app/actions/todos";
import type { Todo } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Item = {
  todo: Todo;
  sourceMeeting: { id: string; title: string } | null;
};

export function OpenTodosList({ items }: { items: Item[] }) {
  const [order, setOrder] = useState<string[]>(() => items.map((i) => i.todo._id));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const serverIds = items.map((i) => i.todo._id);
  const serverKey = serverIds.join(",");
  useEffect(() => {
    setOrder(serverIds);
  }, [serverKey]);

  const byId = new Map(items.map((i) => [i.todo._id, i] as const));

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
    startTransition(() => reorderTodosAction(next));
  };

  const onDragEnd = () => {
    setDraggedId(null);
    setOverId(null);
  };

  return (
    <div className="space-y-2">
      {order.map((id) => {
        const item = byId.get(id);
        if (!item) return null;
        const isDragging = draggedId === id;
        const isOver = overId === id;
        return (
          <div
            key={id}
            draggable
            onDragStart={onDragStart(id)}
            onDragOver={onDragOver(id)}
            onDragLeave={onDragLeave(id)}
            onDrop={onDrop(id)}
            onDragEnd={onDragEnd}
            className={cn(
              "group/drag relative flex items-stretch gap-1 transition-opacity",
              isDragging && "opacity-40",
              isOver &&
                "before:absolute before:-top-1 before:left-8 before:right-0 before:h-0.5 before:rounded-full before:bg-primary"
            )}
          >
            <div
              className="flex shrink-0 cursor-grab items-center pl-1 pr-0.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover/drag:opacity-100 active:cursor-grabbing"
              title="Drag to reorder"
              aria-hidden
            >
              <GripVertical className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <TodoRow todo={item.todo} sourceMeeting={item.sourceMeeting} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
