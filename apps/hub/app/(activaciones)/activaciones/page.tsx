import Link from 'next/link';
import {
  ActivationTypeBadge,
  SolicitudStatusBadge,
} from '@/components/activaciones/SolicitudBadges';
import { SolicitudesTabs } from '@/components/activaciones/SolicitudesTabs';
import { formatDaysSince, formatSolicitudDates } from '@cima/activaciones/dates';
import { SolicitudesFilterBar } from '@/components/activaciones/SolicitudesFilterBar';
import {
  listBrandClients,
  listSolicitudes,
  queueCounts,
  type SolicitudListRow,
} from '@/modules/activaciones/queries';
import { QUEUE_TABS, isQueueTab, type QueueTab } from '@/modules/activaciones/status';

export const dynamic = 'force-dynamic';

// Per-tab empty states (Brief §15 — every empty state says what happens next).
const EMPTY_COPY: Record<QueueTab, string> = {
  nuevas: 'Cuando un cliente envíe una solicitud desde el Client Portal, aparecerá aquí.',
  revision: 'Las solicitudes que el equipo esté trabajando (revisión, cambios, cotización) viven aquí.',
  cliente: 'Solicitudes esperando respuesta del cliente (cambio propuesto o cotización enviada).',
  confirmadas: 'Los eventos confirmados y en ejecución aparecerán aquí.',
  historial: 'Solicitudes completadas, canceladas o rechazadas.',
};

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string; cliente?: string };
}) {
  const tab: QueueTab = isQueueTab(searchParams.tab) ? searchParams.tab : 'nuevas';
  const q = searchParams.q?.trim() || undefined;
  const clientId = searchParams.cliente?.trim() || undefined;

  const [counts, solicitudes, clients] = await Promise.all([
    queueCounts(clientId),
    listSolicitudes({ tab, q, clientId }),
    listBrandClients(),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
        <SolicitudesFilterBar tab={tab} q={q} clientId={clientId} clients={clients} />
      </div>
      <SolicitudesTabs active={tab} counts={counts} clientId={clientId} />

      {q && (
        <p className="mt-4 text-sm text-gray-500">
          {solicitudes.length} resultado{solicitudes.length === 1 ? '' : 's'} para{' '}
          <span className="font-medium text-gray-800">“{q}”</span> en todos los estados
        </p>
      )}

      {solicitudes.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-900">
            {q ? `Sin resultados para “${q}”` : `Nada en “${QUEUE_TABS[tab].label}”`}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            {q ? 'Revisa la ortografía o busca por marca, tienda o evento.' : EMPTY_COPY[tab]}
          </p>
        </div>
      ) : (
        <SolicitudesTable solicitudes={solicitudes} />
      )}
    </div>
  );
}

// The queue rows (Brief §12.1): brand, type badge, store/event, date(s),
// status badge, assigned staff, days since submission. The whole row opens
// the detail view; status/assignment/notes actions live there (Step 4).
function SolicitudesTable({ solicitudes }: { solicitudes: SolicitudListRow[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3">Marca</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Tienda / Evento</th>
            <th className="px-4 py-3">Fecha(s)</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Asignada a</th>
            <th className="px-4 py-3">Enviada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {solicitudes.map((s) => (
            <tr key={s.id} className="relative transition-colors hover:bg-green-50/40">
              <td className="px-4 py-3">
                <Link
                  href={`/activaciones/solicitudes/${s.id}`}
                  className="font-medium text-gray-900 after:absolute after:inset-0"
                >
                  {s.brand}
                </Link>
                {s.brand_clients && (
                  <p className="text-xs text-gray-400">{s.brand_clients.company_name}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <ActivationTypeBadge type={s.activation_type} />
              </td>
              <td className="max-w-56 truncate px-4 py-3 text-gray-600">
                {s.activation_type === 'in_store' ? s.store_name : s.event_name}
                {s.batch_id && (
                  <span className="ml-1.5 rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-500">
                    lote
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {formatSolicitudDates(s)}
              </td>
              <td className="px-4 py-3">
                <SolicitudStatusBadge status={s.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {s.reviewer?.name ?? <span className="text-gray-300">Sin asignar</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                {formatDaysSince(s.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
