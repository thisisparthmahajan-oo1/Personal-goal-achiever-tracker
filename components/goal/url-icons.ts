import {
  ExternalLink,
  FileText,
  BarChart3,
  Notebook,
  Code2,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";

export type UrlIcon = typeof FileText;

/**
 * Pick an icon glyph from a URL's host. Falls back to ExternalLink for
 * unknown hosts or anything that doesn't parse (e.g. file:// paths).
 */
export function pickIcon(url: string): UrlIcon {
  try {
    const host = new URL(url).host.toLowerCase().replace(/^www\./, "");
    if (host.includes("docs.google.com") || host.includes("drive.google.com"))
      return FileText;
    if (host.includes("notion.so") || host.includes("notion.site")) return Notebook;
    if (host.includes("github.com") || host.includes("gitlab.com")) return Code2;
    if (host.includes("grafana") || host.includes("datadog") || host.includes("metabase"))
      return BarChart3;
    if (host.includes("figma.com")) return ImageIcon;
    if (host.includes("slack.com")) return MessageSquare;
    return ExternalLink;
  } catch {
    return ExternalLink;
  }
}

/** Best-effort short label for a URL (host without `www.`, or "link" for opaque schemes). */
export function urlHostLabel(url: string): string {
  try {
    const host = new URL(url).host.replace(/^www\./, "");
    if (host) return host;
    // e.g. file:/// or mailto:foo@bar — surface the scheme.
    const m = url.match(/^([a-z][a-z0-9+\-.]*):/i);
    return m ? m[1] : "link";
  } catch {
    return "link";
  }
}
