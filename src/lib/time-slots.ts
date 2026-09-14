import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

// The one and only timezone used for scheduling pickup/delivery/event times,
// regardless of the customer's browser timezone or the server's runtime
// timezone (Vercel functions run in UTC). Every conversion in this file goes
// through this fixed IANA zone instead of trusting ambient local time -
// that's what actually fixes "we always get Pacific time wrong": naive
// `new Date("4:00 PM")` parsing depends on whoever's clock is reading it.
export const RESTAURANT_TIME_ZONE = "America/Los_Angeles";

const SLOT_INTERVAL_MINUTES = 30;

// Minutes of day, e.g. 11:00 AM -> 660, 10:00 PM -> 1320.
type MinutesWindow = { start: number; end: number };

/**
 * The restaurant's weekly timetable, as minutes of day in Pacific time
 * (Redmond, USA). Source: the Square timetable the restaurant follows.
 * Indexed by JS weekday (0 = Sunday ... 6 = Saturday).
 *
 * Monday        11:00 AM - 10:00 PM
 * Tue-Thu       11:00 AM - 2:30 PM, 4:30 PM - 10:00 PM   (lunch break)
 * Friday/Sat    11:00 AM - 10:45 PM
 * Sunday        11:00 AM - 10:00 PM
 */
const WEEKLY_OPEN_WINDOWS: Record<number, MinutesWindow[]> = {
  0: [{ start: 11 * 60, end: 22 * 60 }], // Sun
  1: [{ start: 11 * 60, end: 22 * 60 }], // Mon
  2: [
    { start: 11 * 60, end: 14 * 60 + 30 }, // Tue
    { start: 16 * 60 + 30, end: 22 * 60 },
  ],
  3: [
    { start: 11 * 60, end: 14 * 60 + 30 }, // Wed
    { start: 16 * 60 + 30, end: 22 * 60 },
  ],
  4: [
    { start: 11 * 60, end: 14 * 60 + 30 }, // Thu
    { start: 16 * 60 + 30, end: 22 * 60 },
  ],
  5: [{ start: 11 * 60, end: 22 * 60 + 45 }], // Fri
  6: [{ start: 11 * 60, end: 22 * 60 + 45 }], // Sat
};

export type TimeSlot = {
  /** "HH:mm" 24-hour, always interpreted in RESTAURANT_TIME_ZONE. */
  value: string;
  /** e.g. "4:00 PM PT" */
  label: string;
};

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" calendar date. */
function weekdayOfDate(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** True when a "YYYY-MM-DD" calendar date falls on a Friday, Saturday, or
 * Sunday (Pacific calendar day) - the restaurant's "weekend special" window
 * for items only made Fri-Sun. */
export function isWeekendDate(dateStr: string): boolean {
  const weekday = weekdayOfDate(dateStr);
  return weekday === 0 || weekday === 5 || weekday === 6;
}

/** The open windows for a calendar date, or [] when the restaurant is closed. */
function getOpenWindowsForDate(dateStr: string): MinutesWindow[] {
  return WEEKLY_OPEN_WINDOWS[weekdayOfDate(dateStr)] ?? [];
}

/** Minutes-of-day from a "HH:mm" string. */
function timeToMinutes(timeStr: string): number {
  const [hour, minute] = timeStr.split(":").map(Number);
  return hour * 60 + minute;
}

function toHHmm(minutesOfDay: number): string {
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function formatTimeLabel(minutesOfDay: number): string {
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

function formatSlotLabel(minutesOfDay: number): string {
  return `${formatTimeLabel(minutesOfDay)} PT`;
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

/** True when the given date+time (Pacific wall-clock) falls inside one of
 * the restaurant's open windows (inclusive of the exact closing minute, so
 * a pickup exactly at close is allowed for validation). */
export function isTimeWithinOpenHours(dateStr: string, timeStr: string): boolean {
  const minutes = timeToMinutes(timeStr);
  return getOpenWindowsForDate(dateStr).some((w) => minutes >= w.start && minutes <= w.end);
}

export type OrderingStatus =
  | { isOpen: true; closesAt: Date }
  | { isOpen: false; opensAt: Date | null };

/**
 * Same "is the restaurant open right now" question as `orderingAvailability`
 * below, but returning real instants instead of a pre-formatted label - lets
 * a client component render a live "closes/opens in Xh Ym Zs" countdown by
 * re-calling this every second with a fresh `now` instead of trusting a
 * value computed once on the server.
 */
export function getOrderingStatus(now: Date): OrderingStatus {
  const todayStr = formatInTimeZone(now, RESTAURANT_TIME_ZONE, "yyyy-MM-dd");
  const minutesNow =
    Number(formatInTimeZone(now, RESTAURANT_TIME_ZONE, "H")) * 60 +
    Number(formatInTimeZone(now, RESTAURANT_TIME_ZONE, "m"));

  const todayWindows = getOpenWindowsForDate(todayStr);
  const currentWindow = todayWindows.find((w) => minutesNow >= w.start && minutesNow < w.end);
  if (currentWindow) {
    return { isOpen: true, closesAt: zonedDateTimeToUtc(todayStr, toHHmm(currentWindow.end)) };
  }

  // Still opens later today (e.g. inside the Tue-Thu lunch break)?
  const nextToday = todayWindows.find((w) => w.start > minutesNow);
  if (nextToday) {
    return { isOpen: false, opensAt: zonedDateTimeToUtc(todayStr, toHHmm(nextToday.start)) };
  }

  // Otherwise the next open day (up to a week ahead).
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const candidate = new Date(now.getTime() + daysAhead * 86_400_000);
    const candidateStr = formatInTimeZone(candidate, RESTAURANT_TIME_ZONE, "yyyy-MM-dd");
    const windows = getOpenWindowsForDate(candidateStr);
    if (windows.length > 0) {
      return { isOpen: false, opensAt: zonedDateTimeToUtc(candidateStr, toHHmm(windows[0].start)) };
    }
  }

  return { isOpen: false, opensAt: null };
}

/**
 * Is the restaurant open for online ordering RIGHT NOW (Pacific), and if
 * not, when does it next open? Order Online pickup is same-day, so this
 * decides whether ordering is "active" per the timetable.
 */
export function orderingAvailability(): { isOpen: boolean; opensLabel: string | null } {
  const now = new Date();
  const todayStr = formatInTimeZone(now, RESTAURANT_TIME_ZONE, "yyyy-MM-dd");
  const minutesNow =
    Number(formatInTimeZone(now, RESTAURANT_TIME_ZONE, "H")) * 60 +
    Number(formatInTimeZone(now, RESTAURANT_TIME_ZONE, "m"));

  const todayWindows = getOpenWindowsForDate(todayStr);
  if (todayWindows.some((w) => minutesNow >= w.start && minutesNow < w.end)) {
    return { isOpen: true, opensLabel: null };
  }

  // Still open later today (e.g. inside the Tue-Thu lunch break)?
  const nextToday = todayWindows.find((w) => w.start > minutesNow);
  if (nextToday) {
    return { isOpen: false, opensLabel: `today at ${formatTimeLabel(nextToday.start)}` };
  }

  // Otherwise the next open day (up to a week ahead).
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const candidate = new Date(now.getTime() + daysAhead * 86_400_000);
    const candidateStr = formatInTimeZone(candidate, RESTAURANT_TIME_ZONE, "yyyy-MM-dd");
    const windows = getOpenWindowsForDate(candidateStr);
    if (windows.length > 0) {
      const dayLabel =
        daysAhead === 1
          ? "tomorrow"
          : formatInTimeZone(candidate, RESTAURANT_TIME_ZONE, "EEEE");
      return { isOpen: false, opensLabel: `${dayLabel} at ${formatTimeLabel(windows[0].start)}` };
    }
  }

  return { isOpen: false, opensLabel: null };
}

/** Business-hours time slots for a given Pacific date, from the open windows
 * of that weekday, excluding any slot less than `minLeadMinutes` away from
 * now (so "today" naturally has fewer options than a date further out). */
export function getAvailableSlots(dateStr: string, minLeadMinutes: number): TimeSlot[] {
  const cutoff = Date.now() + minLeadMinutes * 60_000;
  const slots: TimeSlot[] = [];

  for (const window of getOpenWindowsForDate(dateStr)) {
    for (
      let minutesOfDay = window.start;
      minutesOfDay < window.end;
      minutesOfDay += SLOT_INTERVAL_MINUTES
    ) {
      const value = toHHmm(minutesOfDay);
      const instant = zonedDateTimeToUtc(dateStr, value);
      if (instant.getTime() >= cutoff) {
        slots.push({ value, label: formatSlotLabel(minutesOfDay) });
      }
    }
  }

  return slots;
}
