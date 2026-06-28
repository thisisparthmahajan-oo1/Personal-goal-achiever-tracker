import { differenceInCalendarDays, addDays, startOfDay, format } from "date-fns";

export function formatMoney(value: number, currency: string = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}

export function tripDays(
  start: Date | null,
  end: Date | null
): { date: Date; index: number }[] {
  if (!start || !end) return [];
  const s = startOfDay(start);
  const e = startOfDay(end);
  const span = differenceInCalendarDays(e, s);
  if (span < 0) return [];
  const out: { date: Date; index: number }[] = [];
  for (let i = 0; i <= span; i++) out.push({ date: addDays(s, i), index: i });
  return out;
}

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

export function formatDateFull(d: Date): string {
  return format(d, "EEE, MMM d");
}

export function formatTime(d: Date): string {
  return format(d, "h:mm a");
}

export function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  // yyyy-mm-dd in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toDateTimeInputValue(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}
