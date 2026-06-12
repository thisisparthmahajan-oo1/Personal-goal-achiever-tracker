"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RichRender } from "@/components/editor/RichRender";
import { stripHtml } from "@/components/editor/plain-text";

const CLAMP_THRESHOLD = 180;

export function NotePreviewBody({ body }: { body: string }) {
  const plain = stripHtml(body);
  const isLong = plain.length > CLAMP_THRESHOLD || plain.includes("\n");
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {expanded || !isLong ? (
        <RichRender html={body} className="text-foreground/90" />
      ) : (
        <p className="priv whitespace-pre-wrap text-sm text-foreground/90 line-clamp-3">
          {plain}
        </p>
      )}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              Show full note
            </>
          )}
        </button>
      )}
    </div>
  );
}
