const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isUtcMidnight(value: Date): boolean {
  return (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

/**
 * Calendar dates (YYYY-MM-DD / UTC midnight) must not shift when the browser is
 * in a different timezone than the company. Real instants use the supplied zone.
 */
function dateTimeZone(value: string | Date, timeZone?: string): string | undefined {
  if (typeof value === 'string' && DATE_ONLY.test(value)) return 'UTC';
  if (value instanceof Date && isUtcMidnight(value)) return 'UTC';
  return timeZone;
}

export function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  return new Date(value);
}

/** 23 Oct 2026 */
export function formatDateDMY(
  value: string | Date | null | undefined,
  timeZone?: string
): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: dateTimeZone(value, timeZone),
  }).format(toDate(value));
}

/** 23 October 2026 */
export function formatLongDateDMY(
  value: string | Date | null | undefined,
  timeZone?: string
): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: dateTimeZone(value, timeZone),
  }).format(toDate(value));
}

/** Friday, 23 October 2026 */
export function formatWeekdayDateDMY(
  value: string | Date | null | undefined,
  timeZone?: string
): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: dateTimeZone(value, timeZone),
  }).format(toDate(value));
}

/** 5:30 PM */
export function formatTime12h(
  value: string | Date | null | undefined,
  timeZone?: string
): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timeZone,
  }).format(toDate(value));
}

/** 23 Oct 2026, 5:30 PM */
export function formatDateTimeDMY(
  value: string | Date | null | undefined,
  timeZone?: string
): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: dateTimeZone(value, timeZone),
  }).format(toDate(value));
}

/** 23 Oct */
export function formatDayMonth(value: string | Date | null | undefined, timeZone?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: dateTimeZone(value, timeZone),
  }).format(toDate(value));
}

/** October 2026 */
export function formatMonthYear(value: string | Date | null | undefined, timeZone?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: dateTimeZone(value, timeZone),
  }).format(toDate(value));
}

export function formatDateRangeDMY(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  timeZone?: string
): string {
  if (!start && !end) return '—';
  if (!start) return formatDateDMY(end, timeZone);
  if (!end) return formatDateDMY(start, timeZone);
  return `${formatDateDMY(start, timeZone)} – ${formatDateDMY(end, timeZone)}`;
}

/** Local calendar key for date inputs (never use toISOString for this). */
export function todayDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Native <input type="date"> value from an API date. */
export function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string' && DATE_ONLY.test(value)) return value;
  const date = toDate(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
