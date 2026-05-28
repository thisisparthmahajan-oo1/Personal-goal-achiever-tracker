import { addDays, addMonths, addWeeks, isAfter, isBefore, startOfDay } from "date-fns";
import type { RecurrenceRule } from "@/lib/schemas";

/**
 * Compute occurrence dates between rangeStart and rangeEnd (inclusive),
 * given a recurrence rule and the rule's anchor date (typically the task's
 * due_date or created_at).
 *
 * Returns dates normalized to midnight UTC.
 */
export function expandRecurrence(
  rule: RecurrenceRule,
  anchor: Date,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const occurrences: Date[] = [];
  const end = rule.end_date && isBefore(rule.end_date, rangeEnd) ? rule.end_date : rangeEnd;
  const interval = Math.max(1, rule.interval);

  // Normalize to UTC midnight of the LOCAL calendar day so cross-day
  // comparisons line up with whatever timezone the viewer/server is in.
  const norm = (d: Date) =>
    new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

  const startNorm = norm(rangeStart);
  const endNorm = norm(end);

  if (rule.freq === "daily") {
    let cursor = norm(anchor);
    while (isBefore(cursor, startNorm)) cursor = addDays(cursor, interval);
    while (!isAfter(cursor, endNorm)) {
      if (!isBefore(cursor, startNorm)) occurrences.push(cursor);
      cursor = addDays(cursor, interval);
    }
  } else if (rule.freq === "weekly") {
    const weekdays = rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [anchor.getUTCDay()];
    // Find the start of the week containing the anchor (Sunday = 0).
    let weekStart = norm(anchor);
    weekStart = addDays(weekStart, -weekStart.getUTCDay());
    while (isBefore(addDays(weekStart, 6), startNorm)) {
      weekStart = addWeeks(weekStart, interval);
    }
    while (!isAfter(weekStart, endNorm)) {
      for (const wd of weekdays) {
        const occ = addDays(weekStart, wd);
        if (!isBefore(occ, startNorm) && !isAfter(occ, endNorm) && !isBefore(occ, norm(anchor))) {
          occurrences.push(occ);
        }
      }
      weekStart = addWeeks(weekStart, interval);
    }
  } else if (rule.freq === "monthly") {
    let cursor = norm(anchor);
    while (isBefore(cursor, startNorm)) cursor = addMonths(cursor, interval);
    while (!isAfter(cursor, endNorm)) {
      if (!isBefore(cursor, startNorm)) occurrences.push(cursor);
      cursor = addMonths(cursor, interval);
    }
  }

  return occurrences;
}

export function describeRecurrence(rule: RecurrenceRule): string {
  const interval = rule.interval ?? 1;
  const every = interval === 1 ? "" : `every ${interval} `;
  if (rule.freq === "daily") return `${every || "every "}day${interval > 1 ? "s" : ""}`;
  if (rule.freq === "weekly") {
    if (rule.weekdays && rule.weekdays.length > 0) {
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const days = rule.weekdays.map((d) => names[d]).join(", ");
      return `${every || "every "}week on ${days}`;
    }
    return `${every || "every "}week${interval > 1 ? "s" : ""}`;
  }
  return `${every || "every "}month${interval > 1 ? "s" : ""}`;
}

export { startOfDay };
