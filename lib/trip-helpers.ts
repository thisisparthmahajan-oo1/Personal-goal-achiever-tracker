import { differenceInCalendarDays, startOfDay, format } from "date-fns";

export function nightsBetween(
  start: Date | null,
  end: Date | null
): number | null {
  if (!start || !end) return null;
  const n = differenceInCalendarDays(startOfDay(end), startOfDay(start));
  return n >= 0 ? n : null;
}

export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return differenceInCalendarDays(startOfDay(date), startOfDay(new Date()));
}

export function formatDateShort(d: Date): string {
  return format(d, "MMM d");
}

export function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  // yyyy-mm-dd in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
