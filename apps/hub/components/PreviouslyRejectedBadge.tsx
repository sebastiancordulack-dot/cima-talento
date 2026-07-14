// "Rechazado anteriormente" badge — shown when a new application matched the
// rejected_applicants suppression list at ingest (the original record was
// deleted, so this flag is the only trace).
import { formatDate } from '@/lib/format';

export function PreviouslyRejectedBadge({ rejectedAt }: { rejectedAt: string | null }) {
  if (!rejectedAt) return null;
  return (
    <span
      className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20"
      title={`Una solicitud anterior con este correo fue rechazada el ${formatDate(rejectedAt)}.`}
    >
      Rechazado anteriormente
    </span>
  );
}
