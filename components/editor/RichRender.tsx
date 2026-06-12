import { cn } from "@/lib/utils";
import { escapeHtml, looksLikeHtml } from "./plain-text";

/**
 * Read-only display of a body string. Accepts both Tiptap-authored HTML and
 * legacy plain-text bodies. Server-safe — no client JS required.
 */
export function RichRender({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html) return null;
  const prepared = looksLikeHtml(html)
    ? html
    : `<p>${escapeHtml(html).replace(/\n/g, "<br />")}</p>`;
  return (
    <div
      className={cn("prose-tracker priv", className)}
      dangerouslySetInnerHTML={{ __html: prepared }}
    />
  );
}
