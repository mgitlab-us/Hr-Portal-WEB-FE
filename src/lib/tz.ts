/**
 * Pakistan-only timezone helpers.
 * Every conversion uses an explicit timezone and never depends on the
 * browser's or server's local timezone.
 */

export const APP_TIMEZONE = 'Asia/Karachi';

/** Offset (ms) of `timeZone` from UTC at the given UTC instant. */
function getOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(new Date(utcMs))
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Convert a wall-clock date + time in `timeZone` to the exact UTC instant.
 * @param date "YYYY-MM-DD"
 * @param time "HH:mm"
 */
export function zonedWallTimeToUtc(
  date: string,
  time: string,
  timeZone: string = APP_TIMEZONE
): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid date/time: "${date}" "${time}"`);
  }

  const naiveUtc = Date.UTC(y, m - 1, d, hh, mm);
  const firstOffset = getOffsetMs(naiveUtc, timeZone);
  let utc = naiveUtc - firstOffset;

  const secondOffset = getOffsetMs(utc, timeZone);
  if (secondOffset !== firstOffset) utc = naiveUtc - secondOffset;

  return new Date(utc);
}

/** UTC ISO string (with Z) ready to send to the API. */
export function zonedWallTimeToIso(
  date: string,
  time: string,
  timeZone: string = APP_TIMEZONE
): string {
  return zonedWallTimeToUtc(date, time, timeZone).toISOString();
}

/** Instant -> "09:00 AM" in `timeZone`. */
export function formatTime12hInZone(
  value: string | Date,
  timeZone: string = APP_TIMEZONE
): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}