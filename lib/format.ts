// Display formatters. A fixed timeZone keeps server/client render identical
// (no hydration mismatch) and reads sensibly for a US-based team.
const TZ = 'America/New_York';

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));
}

export function fullName(first: string, last: string | null): string {
  return [first, last].filter(Boolean).join(' ');
}

const DAY_ABBR: Record<string, string> = {
  mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Compact summary of structured weekly availability for the dispatch board. */
export function formatAvailability(availability: Record<string, string[]> | null | undefined): string {
  if (!availability) return 'Sin definir';
  const days = DAY_ORDER.filter((d) => (availability[d]?.length ?? 0) > 0);
  if (days.length === 0) return 'Sin definir';
  return days.map((d) => DAY_ABBR[d]).join(' · ');
}
