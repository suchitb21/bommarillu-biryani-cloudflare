import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const TIME_ZONE = "America/Los_Angeles";

/**
 * The next midnight in Pacific time strictly after `now` - when a "today only"
 * sold-out entry should clear. Works on the calendar *date* in Pacific time
 * rather than adding 24 hours, so the 23-hour and 25-hour daylight-saving days
 * come out right. A `now` that is exactly midnight rolls to the following one.
 *
 * Imports date-fns-tz directly (not src/lib/time-slots.ts) so this file has no
 * "@/" alias imports and can run under `node --test`.
 */
export function midnightPacific(now: Date): Date {
  const today = formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd");
  const [year, month, day] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  return fromZonedTime(`${tomorrow}T00:00:00`, TIME_ZONE);
}
