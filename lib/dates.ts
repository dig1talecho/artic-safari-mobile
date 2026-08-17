/**
 * Booking dates, anchored to Tromsø. Mirror of lib/dates.ts in the web
 * project — the two apps insert into the same table, so they have to agree
 * on what "today" means.
 *
 * THE BUG THIS KILLS
 * The app filled in today's date with `toISOString()`, which is UTC, while
 * the validator compared it against the phone's local midnight. In Norway
 * (UTC+2 in summer) every booking made between 22:00 and midnight
 * submitted yesterday's date and was rejected as being in the past —
 * exactly the hours people book taxis.
 *
 * A booking date is a Tromsø date: a guest in Tokyo asking for "tomorrow"
 * means tomorrow here. Anchoring to one timezone also makes the result
 * identical for every guest, wherever they are standing.
 *
 * Works on 'YYYY-MM-DD' strings, which sort correctly as plain text, so
 * comparisons never touch a Date and cannot pick up a timezone en route.
 */

const TROMSO_TZ = "Europe/Oslo";

/** Today in Tromsø, as 'YYYY-MM-DD'. `en-CA` is the locale that formats that way. */
export function tromsoToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TROMSO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The same calendar day N years on. UTC arithmetic on purpose: the input is
 * a plain calendar date, so this is day counting that must not drift across
 * a daylight-saving change. 29 February clamps to the 28th when the target
 * year is not a leap year.
 */
export function tromsoDatePlusYears(years: number, now: Date = new Date()): string {
  const [y, m, d] = tromsoToday(now).split("-").map(Number);
  const target = new Date(Date.UTC(y + years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
  return target.toISOString().split("T")[0];
}

/** '2026-02-31' passes a regex but is not a day, and JS would roll it to March. */
export function isRealCalendarDate(value: string): boolean {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Today through two years out — the window a booking date must fall in. */
export function isBookableDate(value: string, now: Date = new Date()): boolean {
  if (!isRealCalendarDate(value)) return false;
  return value >= tromsoToday(now) && value <= tromsoDatePlusYears(2, now);
}

/** Whole days from today (Tromsø) to a booking date. Negative means past. */
export function daysUntil(bookingDate: string, now: Date = new Date()): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(bookingDate) - toUtc(tromsoToday(now))) / 86_400_000);
}
