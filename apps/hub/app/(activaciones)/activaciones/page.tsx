import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { Card, EmptyState, Table, TBody, Td, Th, THead, Tr, PageHeader } from '@cima/ui';
import {
  ActivationTypeBadge,
  SolicitudStatusBadge,
} from '@/components/activaciones/SolicitudBadges';
import { HistorialTab, SolicitudesTabs } from '@/components/activaciones/SolicitudesTabs';
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
    <div className="space-y-5">
      <PageHeader
        title="Solicitudes"
        description="Solicitudes de activación enviadas por los clientes"
        actions={<SolicitudesFilterBar tab={tab} q={q} clientId={clientId} clients={clients} />}
      />

      <SolicitudesTabs active={tab} counts={counts} clientId={clientId} />

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-stone-900">
            {q ? (
              <>
                Resultados para “{q}”
                <span className="ml-1.5 font-normal text-stone-400">· todos los estados</span>
              </>
            ) : (
              QUEUE_TABS[tab].label
            )}
            <span className="ml-1.5 font-normal tabular-nums text-stone-400">
              ({solicitudes.length})
            </span>
          </h2>
          <HistorialTab active={tab === 'historial'} count={counts.historial} clientId={clientId} />
        </div>

        {solicitudes.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" strokeWidth={1.75} />}
            title={q ? `Sin resultados para “${q}”` : `Nada en “${QUEUE_TABS[tab].label}”`}
            description={
              q ? 'Revisa la ortografía o busca por marca, tienda o evento.' : EMPTY_COPY[tab]
            }
          />
        ) : (
          <SolicitudesTable solicitudes={solicitudes} />
        )}
      </Card>
    </div>
  );
}

// The queue rows (Brief §12.1): brand, type badge, store/event, date(s),
// status badge, assigned staff, days since submission. The whole row opens
// the detail view; status/assignment/notes actions live there.
function SolicitudesTable({ solicitudes }: { solicitudes: SolicitudListRow[] }) {
  return (
    <Table>
      <THead>
        <Th>Marca</Th>
        <Th>Tipo</Th>
        <Th>Tienda / Evento</Th>
        <Th>Fecha(s)</Th>
        <Th>Estado</Th>
        <Th>Asignada a</Th>
        <Th>Enviada</Th>
      </THead>
      <TBody>
        {solicitudes.map((s) => (
          <Tr key={s.id} interactive className="relative">
            <Td>
              <Link
                href={`/activaciones/solicitudes/${s.id}`}
                className="font-medium text-stone-900 after:absolute after:inset-0"
              >
                {s.brand}
              </Link>
              {s.brand_clients && (
                <p className="text-xs text-stone-400">{s.brand_clients.company_name}</p>
              )}
            </Td>
            <Td>
              <ActivationTypeBadge type={s.activation_type} />
            </Td>
            <Td className="max-w-56 truncate text-stone-600">
              {s.activation_type === 'in_store' ? s.store_name : s.event_name}
              {s.batch_id && (
                <span className="ml-1.5 rounded bg-stone-100 px-1 py-0.5 text-[10px] font-medium text-stone-500">
                  lote
                </span>
              )}
            </Td>
            <Td className="whitespace-nowrap text-stone-600">{formatSolicitudDates(s)}</Td>
            <Td>
              <SolicitudStatusBadge status={s.status} />
            </Td>
            <Td className="whitespace-nowrap text-stone-600">
              {s.reviewer?.name ?? <span className="text-stone-300">Sin asignar</span>}
            </Td>
            <Td className="whitespace-nowrap text-stone-400">{formatDaysSince(s.created_at)}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
