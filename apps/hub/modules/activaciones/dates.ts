// Date display helpers for Solicitudes. Activation dates are calendar dates
// (Postgres `date` / `daterange`), NOT timestamps — format them in UTC so the
// calendar day never shifts across timezones (lib/format.ts formatters are for
// timestamps and pin America/New_York, which would show the previous day for
// a UTC-midnight date).

const DAY_MS = 86_400_000;

const plainDateFmt = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-07-04" → "04 jul 2026". */
export function formatPlainDate(date: string | null): string {
  if (!date) return '—';
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '—' : plainDateFmt.format(d);
}

export interface DateSpan {
  start: string; // inclusive, YYYY-MM-DD
  end: string;   // inclusive, YYYY-MM-DD
}

/**
 * Parse a Postgres daterange literal, e.g. "[2026-07-01,2026-07-05)".
 * Postgres normalizes dateranges to inclusive-start / exclusive-end, but both
 * bound styles are handled. Returns inclusive start/end.
 */
export function parseDateRange(range: string | null): DateSpan | null {
  if (!range) return null;
  const m = range.match(/^([\[\(])(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})([\]\)])$/);
  if (!m) return null;
  const [, open, rawStart, rawEnd, close] = m;

  const shift = (date: string, days: number): string => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const start = open === '(' ? shift(rawStart, 1) : rawStart;
  const end = close === ')' ? shift(rawEnd, -1) : rawEnd;
  return { start, end };
}

/** The activation's calendar date(s) for list rows: single date for in-store,
 *  "start – end" for multi-day field events. */
export function formatSolicitudDates(s: {
  activation_type: 'in_store' | 'field_event';
  date: string | null;
  event_dates: string | null;
}): string {
  if (s.activation_type === 'in_store') return formatPlainDate(s.date);
  const span = parseDateRange(s.event_dates);
  if (!span) return '—';
  if (span.start === span.end) return formatPlainDate(span.start);
  return `${formatPlainDate(span.start)} – ${formatPlainDate(span.end)}`;
}

/** Whole days elapsed since an ISO timestamp (for "days since submission"). */
export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));
}

/** "hoy" / "hace 1 día" / "hace N días". */
export function formatDaysSince(iso: string): string {
  const days = daysSince(iso);
  if (days === 0) return 'hoy';
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}
