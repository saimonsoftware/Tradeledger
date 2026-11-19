import { addDays, format, getISODay, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

// Week rules (CLAUDE.md 5.5): Monday 00:00 → Sunday 23:59:59 in the USER'S timezone.
// A trade's P&L belongs to the week in which it was CLOSED (exit_time).
//
// Calendar arithmetic happens on plain "yyyy-MM-dd" date strings, and only the
// final boundaries are converted to UTC instants. That keeps the result correct
// whatever timezone the server itself runs in, and across daylight-saving changes.

/** The calendar date ("yyyy-MM-dd") of an instant, as seen in `tz`. */
export const localDateKey = (instant: string | Date, tz: string) =>
  formatInTimeZone(instant, tz, "yyyy-MM-dd");

const shiftDate = (dateKey: string, days: number) =>
  format(addDays(parseISO(dateKey), days), "yyyy-MM-dd");

/** UTC instant of 00:00 on a calendar date in `tz`. */
export const startOfLocalDay = (dateKey: string, tz: string) =>
  fromZonedTime(`${dateKey}T00:00:00`, tz);

export type WeekRange = {
  /** The 7 calendar dates, Monday first. */
  days: string[];
  /** Inclusive start: Monday 00:00 local, as a UTC instant. */
  start: Date;
  /** Exclusive end: next Monday 00:00 local, as a UTC instant. */
  end: Date;
};

/** The week containing `now` in `tz`. offset -1 = previous week, +1 = next. */
export function weekRange(now: Date, tz: string, offset = 0): WeekRange {
  const today = localDateKey(now, tz);
  const isoDay = getISODay(parseISO(today)); // 1 = Monday … 7 = Sunday
  const monday = shiftDate(today, -(isoDay - 1) + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
  return {
    days,
    start: startOfLocalDay(monday, tz),
    end: startOfLocalDay(shiftDate(monday, 7), tz),
  };
}

/** True if the instant falls inside the week: start ≤ t < end. */
export const isInWeek = (instant: string | Date, week: WeekRange) => {
  const t = new Date(instant).getTime();
  return t >= week.start.getTime() && t < week.end.getTime();
};

/** The last `n` calendar dates ending today (oldest first), in `tz`. */
export function lastNDays(now: Date, tz: string, n: number): string[] {
  const today = localDateKey(now, tz);
  return Array.from({ length: n }, (_, i) => shiftDate(today, i - (n - 1)));
}
