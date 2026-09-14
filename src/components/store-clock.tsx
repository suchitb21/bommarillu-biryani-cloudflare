"use client";

import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { RESTAURANT_TIME_ZONE, getOrderingStatus } from "@/lib/time-slots";
import "./store-clock.css";

/** "2h 14m 6s" - drops the leading unit(s) once they hit zero, so the very
 * end of a countdown reads "6s" instead of "0h 0m 6s". */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (hours > 0 || minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

/**
 * Live Pacific-time clock + online-ordering open/closed countdown, shown on
 * /order-online. Exists mainly because the restaurant's hours are defined in
 * Pacific time while this is developed/operated from very different
 * timezones - a ticking "closes in 1h 4m" removes all the mental timezone
 * math of cross-checking a static hours list against "what time is it there
 * right now".
 *
 * Renders nothing until mounted: a live clock's exact second cannot match
 * between server-render and client-hydration, so it must only ever render
 * client-side (same reasoning as the isClient gate in OrderEntryModal).
 */
export function StoreClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="store-clock store-clock--placeholder" aria-hidden="true" />;
  }

  const status = getOrderingStatus(now);
  const timeLabel = formatInTimeZone(now, RESTAURANT_TIME_ZONE, "h:mm:ss a");
  const dayLabel = formatInTimeZone(now, RESTAURANT_TIME_ZONE, "EEEE, MMM d");

  return (
    <div className="store-clock">
      <div className="store-clock-time">
        <span className="store-clock-value">{timeLabel}</span>
        <span className="store-clock-tz">Pacific Time &middot; Redmond, WA &middot; {dayLabel}</span>
      </div>
      <div
        className={
          status.isOpen
            ? "store-clock-status store-clock-status--open"
            : "store-clock-status store-clock-status--closed"
        }
      >
        <span className="store-clock-dot" />
        {status.isOpen ? (
          <span>
            Open now &middot; closes at{" "}
            {formatInTimeZone(status.closesAt, RESTAURANT_TIME_ZONE, "h:mm a")} &middot; in{" "}
            {formatCountdown(status.closesAt.getTime() - now.getTime())}
          </span>
        ) : status.opensAt ? (
          <span>
            Closed &middot; opens{" "}
            {formatInTimeZone(status.opensAt, RESTAURANT_TIME_ZONE, "EEE h:mm a")} &middot; in{" "}
            {formatCountdown(status.opensAt.getTime() - now.getTime())}
          </span>
        ) : (
          <span>Currently closed</span>
        )}
      </div>
    </div>
  );
}
