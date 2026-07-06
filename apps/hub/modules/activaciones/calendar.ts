// Month-grid math for the Confirmed Events Tracker (Brief §12.3). Pure
// calendar-date arithmetic in UTC — no timezones, no server-only imports.
import { parseDateRange } from '@cima/activaciones/dates';

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string;
  inMonth: boolean;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string | undefined): value is string {
  return value !== undefined && MONTH_RE.test(value);
}

/** The month ("YYYY-MM") containing today, US Eastern. */
export function currentMonthKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date());
}

/** Today as YYYY-MM-DD, US Eastern (for the "today" ring). */
export function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Monday-start week rows covering the whole month (5–6 rows of 7). */
export function buildMonthGrid(month: string): CalendarDay[][] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7)); // back to Monday

  const weeks: CalendarDay[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: iso(cursor), inMonth: cursor.getUTCMonth() === m - 1 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getUTCMonth() === m - 1);
  return weeks;
}

/** Every calendar day an activation occupies: its single date for in-store,
 *  the full inclusive range for field events. */
export function eventDays(e: {
  activation_type: 'in_store' | 'field_event';
  date: string | null;
  event_dates: string | null;
}): string[] {
  if (e.activation_type === 'in_store') return e.date ? [e.date] : [];
  const span = parseDateRange(e.event_dates);
  if (!span) return [];
  const days: string[] = [];
  const cursor = new Date(`${span.start}T00:00:00Z`);
  const end = new Date(`${span.end}T00:00:00Z`);
  while (cursor <= end && days.length < 62) {
    days.push(iso(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
