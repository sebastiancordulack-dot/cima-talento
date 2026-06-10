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
