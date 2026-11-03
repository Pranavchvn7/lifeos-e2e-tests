/**
 * Date helpers. Everything is UTC because playwright.config.ts also sets the browser timezone to UTC,
 * so "today" inside the app and the dates computed here always agree.
 */

export const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as const;
export type WeekdayName = keyof typeof WEEKDAY;

/** YYYY-MM-DD */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * The most recent given weekday (0 = Sunday … 6 = Saturday) strictly before today, at `hours:minutes` UTC.
 * Used to pin the browser clock to a known weekday. It is always in the past (never the future),
 * which keeps login sessions valid.
 */
export function lastWeekday(weekday: number, hours = 12, minutes = 0, now: Date = new Date()): Date {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes));
  do {
    date.setUTCDate(date.getUTCDate() - 1);
  } while (date.getUTCDay() !== weekday);
  return date;
}
