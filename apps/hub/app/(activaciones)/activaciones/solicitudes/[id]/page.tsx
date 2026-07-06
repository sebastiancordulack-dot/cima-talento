import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ActivationTypeBadge,
  SolicitudStatusBadge,
} from '@/components/activaciones/SolicitudBadges';
import { formatDaysSince, formatSolicitudDates } from '@/modules/activaciones/dates';
import { getSolicitud } from '@/modules/activaciones/queries';

export const dynamic = 'force-dynamic';

// Solicitud detail (Brief §12.2) — header is real; the two-panel workspace
// (client submission + CiMA quote/changes/talent tooling) lands in Step 4.
export default async function SolicitudDetailPage({ params }: { params: { id: string } }) {
  const solicitud = await getSolicitud(params.id);
  if (!solicitud) notFound();

  const title =
    solicitud.activation_type === 'in_store' ? solicitud.store_name : solicitud.event_name;

  return (
    <div>
      <Link href="/activaciones" className="text-sm text-gray-400 hover:text-gray-600">
        ← Solicitudes
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{solicitud.brand}</h1>
        <ActivationTypeBadge type={solicitud.activation_type} />
        <SolicitudStatusBadge status={solicitud.status} />
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {title} · {formatSolicitudDates(solicitud)}
        {solicitud.brand_clients && <> · {solicitud.brand_clients.company_name}</>}
        {' · '}enviada {formatDaysSince(solicitud.created_at)}
      </p>

      <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">Espacio de trabajo en construcción</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
          Aquí vivirán la vista completa de la solicitud, las notas internas, la cotización, los
          cambios propuestos y la asignación de talento.
        </p>
      </div>
    </div>
  );
}
