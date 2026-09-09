import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

// The one and only timezone used for scheduling pickup/delivery/event times,
// regardless of the customer's browser timezone or the server's runtime
// timezone (Vercel functions run in UTC). Every conversion in this file goes
// through this fixed IANA zone instead of trusting ambient local time -
// that's what actually fixes "we always get Pacific time wrong": naive
// `new Date("4:00 PM")` parsing depends on whoever's clock is reading it.
export const RESTAURANT_TIME_ZONE = "America/Los_Angeles";

// Business hours from the site footer: 11:55 AM - 10:44 PM daily.
const OPEN_MINUTES_OF_DAY = 11 * 60 + 55;
const CLOSE_MINUTES_OF_DAY = 22 * 60 + 44;
const SLOT_INTERVAL_MINUTES = 30;

export type TimeSlot = {
  /** "HH:mm" 24-hour, always interpreted in RESTAURANT_TIME_ZONE. */
  value: string;
  /** e.g. "4:00 PM PT" */
  label: string;
};

function formatSlotLabel(minutesOfDay: number): string {
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period} PT`;
}

/** Converts a "YYYY-MM-DD" date + "HH:mm" time, both meant as wall-clock
 * time in RESTAURANT_TIME_ZONE, into the correct UTC instant (handles the
 * PST/PDT DST transition automatically). */
export function zonedDateTimeToUtc(dateStr: string, timeStr: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, RESTAURANT_TIME_ZONE);
}

/** Today's date, as a "YYYY-MM-DD" string, in Pacific time - not the
 * server's or browser's local date, which can differ near midnight. */
export function todayInRestaurantTimeZone(): string {
  return formatInTimeZone(new Date(), RESTAURANT_TIME_ZONE, "yyyy-MM-dd");
}

/** The earliest selectable date ("YYYY-MM-DD", Pacific) that is at least
 * `minLeadMinutes` from now. */
export function earliestDateForLeadTime(minLeadMinutes: number): string {
  const earliest = new Date(Date.now() + minLeadMinutes * 60_000);
  return formatInTimeZone(earliest, RESTAURANT_TIME_ZONE, "yyyy-MM-dd");
}

/** Business-hours time slots for a given Pacific date, excluding any slot
 * less than `minLeadMinutes` away from now (so "today" naturally has fewer
 * options than a date further out). */
export function getAvailableSlots(dateStr: string, minLeadMinutes: number): TimeSlot[] {
  const cutoff = Date.now() + minLeadMinutes * 60_000;
  const slots: TimeSlot[] = [];

  for (
    let minutesOfDay = OPEN_MINUTES_OF_DAY;
    minutesOfDay <= CLOSE_MINUTES_OF_DAY;
    minutesOfDay += SLOT_INTERVAL_MINUTES
  ) {
    const hour = Math.floor(minutesOfDay / 60);
    const minute = minutesOfDay % 60;
    const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    const instant = zonedDateTimeToUtc(dateStr, value);
    if (instant.getTime() >= cutoff) {
      slots.push({ value, label: formatSlotLabel(minutesOfDay) });
    }
  }

  return slots;
}
