import Link from 'next/link';
import { formatPlainDate, formatSolicitudDates } from '@/modules/activaciones/dates';
import type { BatchSibling, SolicitudListRow } from '@/modules/activaciones/queries';
import { SolicitudStatusBadge } from '@/components/activaciones/SolicitudBadges';

// Left panel (Brief §12.2): everything the client submitted, read-only.
// Fields render per activation type (§6A vs §6B).

const BUDGET_LABELS: Record<string, string> = {
  under_5k: 'Menos de $5k',
  '5k_10k': '$5k – $10k',
  '10k_20k': '$10k – $20k',
  '20k_plus': '$20k+',
  not_defined: 'Aún sin definir',
};

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : '—';
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="col-span-2 text-sm text-gray-800">{value ?? '—'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{title}</h2>
      <dl className="divide-y divide-gray-50">{children}</dl>
    </section>
  );
}

export function SubmissionPanel({
  solicitud,
  siblings,
}: {
  solicitud: SolicitudListRow;
  siblings: BatchSibling[];
}) {
  const s = solicitud;
  return (
    <div className="space-y-4">
      <Section title="Solicitud del cliente">
        <Row label="Marca" value={s.brand} />
        <Row label="Marcas destacadas" value={s.brands_featured} />
        <Row label="Embajadores" value={s.num_brand_ambassadors} />
        {s.activation_type === 'in_store' ? (
          <>
            <Row label="Fecha" value={formatPlainDate(s.date)} />
            <Row label="Horario" value={`${formatTime(s.time_start)} – ${formatTime(s.time_end)}`} />
            <Row label="Tienda" value={s.store_name} />
            <Row label="Dirección" value={s.store_address} />
            <Row label="Tipo de tienda" value={s.store_type} />
            <Row
              label="Contacto tienda"
              value={[s.store_contact_name, s.store_contact_phone].filter(Boolean).join(' · ') || null}
            />
            <Row label="Rep. distribuidor" value={s.distributor_rep_name} />
            <Row label="Producto disponible" value={s.product_quantity} />
            <Row label="Promociones" value={s.special_promotions} />
            <Row label="Comentarios" value={s.comments} />
          </>
        ) : (
          <>
            <Row label="Evento" value={s.event_name} />
            <Row label="Venue" value={s.event_venue} />
            <Row label="Dirección" value={s.event_address} />
            <Row label="Fechas" value={formatSolicitudDates(s)} />
            <Row label="Montaje" value={formatTime(s.setup_time)} />
            <Row
              label="Activación"
              value={`${formatTime(s.activation_time_start)} – ${formatTime(s.activation_time_end)}`}
            />
            <Row label="Desmontaje" value={formatTime(s.teardown_time)} />
            <Row label="Asistencia esperada" value={s.expected_attendance} />
            <Row
              label="Necesidades"
              value={
                s.activation_needs.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {s.activation_needs.map((n) => (
                      <span
                        key={n}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                      >
                        {n}
                      </span>
                    ))}
                  </span>
                ) : null
              }
            />
            <Row label="Visión del cliente" value={s.activation_vision} />
            <Row label="Assets del cliente" value={s.client_supplied_assets} />
            <Row label="Consideraciones" value={s.special_considerations} />
            <Row label="Presupuesto" value={s.budget_range ? BUDGET_LABELS[s.budget_range] : null} />
          </>
        )}
      </Section>

      {s.batch_id && (
        <Section title={`Lote — ${siblings.length + 1} ubicaciones`}>
          <p className="pb-2 text-xs text-gray-500">
            Envío multi-ubicación: una sola cotización cubre todas las tiendas (§6A).
          </p>
          {siblings.map((sib) => (
            <div key={sib.id} className="flex items-center justify-between gap-2 py-1.5">
              <Link
                href={`/activaciones/solicitudes/${sib.id}`}
                className="text-sm text-green-700 hover:underline"
              >
                {sib.store_name ?? 'Ubicación'}
              </Link>
              <SolicitudStatusBadge status={sib.status} />
            </div>
          ))}
        </Section>
      )}

      {s.brand_clients && (
        <Section title="Cliente">
          <Row label="Empresa" value={s.brand_clients.company_name} />
        </Section>
      )}
    </div>
  );
}
