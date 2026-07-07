import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { CLIENT_STATUS_META } from '@/lib/status';
import { formatSolicitudDates } from '@cima/activaciones/dates';
import type { ClientSolicitud } from '@/lib/queries';

export function RequestCard({ solicitud }: { solicitud: ClientSolicitud }) {
  const s = solicitud;
  const meta = CLIENT_STATUS_META[s.status];
  const place = s.activation_type === 'in_store' ? s.store_name : s.event_name;

  return (
    <Link
      href={`/requests/${s.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-gray-900">{s.brand}</p>
        <StatusBadge status={s.status} />
      </div>
      <p className="mt-1 text-sm text-gray-600">
        {place}
        {s.batch_id && (
          <span className="ml-1.5 rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-500">
            multi-location
          </span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">
        {s.activation_type === 'in_store' ? 'In-store activation' : 'Field / event activation'} ·{' '}
        {formatSolicitudDates(s)}
      </p>
      {meta.actionNeeded && (
        <p className="mt-3 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
          {s.status === 'quote_sent' ? 'Review & approve your quote →' : 'Review the proposed change →'}
        </p>
      )}
    </Link>
  );
}
