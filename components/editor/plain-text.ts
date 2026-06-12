/**
 * Strip HTML tags and decode common entities to produce a plain-text approximation
 * of an editor body. Used wherever we need the text for length checks, truncation,
 * clipboard copying, or snippet rendering.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  // Replace <br> and block-closing tags with newlines/spaces so the rendered
  // structure is preserved in plain text.
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|blockquote|div|ul|ol)>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Heuristic: does this string look like Tiptap-authored HTML?
 * (Used to decide whether to wrap legacy plain-text content in a <p> tag.)
 */
export function looksLikeHtml(s: string): boolean {
  if (!s) return false;
  return /^\s*</.test(s) && /<\/?(p|h[1-6]|ul|ol|li|strong|em|blockquote|br)\b/i.test(s);
}

/**
 * Escape characters that would be interpreted as HTML for safe direct-insertion
 * via dangerouslySetInnerHTML.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
