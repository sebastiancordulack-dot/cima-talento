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
      className="block rounded-2xl border border-stone-200/70 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-stone-900">{s.brand}</p>
        <StatusBadge status={s.status} />
      </div>
      <p className="mt-1 text-sm text-stone-600">
        {place}
        {s.batch_id && (
          <span className="ml-1.5 rounded bg-stone-100 px-1 py-0.5 text-[10px] font-medium text-stone-500">
            multi-location
          </span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-stone-400">
        {s.activation_type === 'in_store' ? 'In-store activation' : 'Field / event activation'} ·{' '}
        {formatSolicitudDates(s)}
      </p>
      {meta.actionNeeded && (
        <p className="mt-3 rounded-xl bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-800">
          {s.status === 'quote_sent' ? 'Review & approve your quote →' : 'Review the proposed change →'}
        </p>
      )}
    </Link>
  );
}
