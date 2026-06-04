"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const CLAMP_THRESHOLD = 180;

export function NotePreviewBody({ body }: { body: string }) {
  const isLong = body.length > CLAMP_THRESHOLD || body.includes("\n");
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={`priv whitespace-pre-wrap text-sm text-foreground/90 ${
          !expanded && isLong ? "line-clamp-3" : ""
        }`}
      >
        {body}
      </p>
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
