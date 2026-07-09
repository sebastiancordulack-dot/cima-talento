import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardHeader, type BadgeTone } from '@cima/ui';
import {
  ActivationTypeBadge,
  SolicitudStatusBadge,
} from '@/components/activaciones/SolicitudBadges';
import { InternalFieldsForm } from '@/components/activaciones/InternalFieldsForm';
import { ProposeChangeForm } from '@/components/activaciones/ProposeChangeForm';
import { QuoteBuilder } from '@/components/activaciones/QuoteBuilder';
import { ReviewerControl, StatusControls } from '@/components/activaciones/StatusControls';
import { SubmissionPanel } from '@/components/activaciones/SubmissionPanel';
import { TalentAssignPanel } from '@/components/activaciones/TalentAssignPanel';
import { formatDateTime } from '@/lib/format';
import { formatDaysSince, formatSolicitudDates } from '@cima/activaciones/dates';
import {
  getSolicitudDetail,
  type SolicitudChange,
  type StatusLogEntry,
} from '@/modules/activaciones/queries';
import { parseQuoteData, type QuoteData } from '@cima/activaciones/quote';
import {
  CHANGE_RESPONSE_META,
  CHANGE_TYPE_LABELS,
  SOLICITUD_STATUS_META,
} from '@/modules/activaciones/status';

export const dynamic = 'force-dynamic';

// Solicitud detail workspace (Brief §12.2): client submission on the left,
// CiMA tooling (internal fields, quote, changes, talent, status) on the right,
// status history at the bottom. Sticky summary card keeps brand/status/actions
// in view while working (spec §7.1).
export default async function SolicitudDetailPage({ params }: { params: { id: string } }) {
  const detail = await getSolicitudDetail(params.id);
  if (!detail) notFound();
  const { solicitud, siblings, changes, log, assignments, talentOptions, suggestedMetro } = detail;

  const title =
    solicitud.activation_type === 'in_store' ? solicitud.store_name : solicitud.event_name;

  // One quote covers the whole batch (§6A): sections for every location,
  // seeded from the stored quote or freshly from the batch members.
  const members = [
    {
      id: solicitud.id,
      label: solicitud.store_name ?? solicitud.event_name ?? 'Activación',
    },
    ...siblings.map((s) => ({ id: s.id, label: s.store_name ?? 'Ubicación' })),
  ].sort((a, b) => a.label.localeCompare(b.label));
  const initialQuote: QuoteData = parseQuoteData(solicitud.quote_line_items) ?? {
    sections: members.map((m) => ({ solicitud_id: m.id, label: m.label, items: [] })),
    total: 0,
  };

  const talentEnabled = solicitud.status === 'confirmed' || solicitud.status === 'in_progress';

  return (
    <div className="space-y-5">
      <Link href="/activaciones" className="text-sm text-stone-400 hover:text-stone-600">
        ← Solicitudes
      </Link>

      <Card className="sticky top-4 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              {solicitud.brand}
            </h1>
            <ActivationTypeBadge type={solicitud.activation_type} />
            <SolicitudStatusBadge status={solicitud.status} />
          </div>
          <ReviewerControl
            solicitudId={solicitud.id}
            reviewerName={solicitud.reviewer?.name ?? null}
          />
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {title} · {formatSolicitudDates(solicitud)}
          {solicitud.brand_clients && <> · {solicitud.brand_clients.company_name}</>}
          {' · '}enviada {formatDaysSince(solicitud.created_at)}
        </p>
        <div className="mt-4">
          <StatusControls solicitudId={solicitud.id} status={solicitud.status} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SubmissionPanel solicitud={solicitud} siblings={siblings} />
        </div>
        <div className="space-y-5 lg:col-span-3">
          <InternalFieldsForm solicitud={solicitud} />
          <QuoteBuilder
            solicitudId={solicitud.id}
            initial={initialQuote}
            initialNotes={solicitud.quote_notes}
            status={solicitud.status}
            isBatch={!!solicitud.batch_id}
          />
          {solicitud.status === 'in_review' && <ProposeChangeForm solicitudId={solicitud.id} />}
          {changes.length > 0 && <ChangesList changes={changes} />}
          <TalentAssignPanel
            solicitudId={solicitud.id}
            assigned={assignments}
            options={talentOptions}
            suggestedMetro={suggestedMetro}
            enabled={talentEnabled}
          />
        </div>
      </div>

      <StatusHistory log={log} />
    </div>
  );
}

const RESPONSE_TONES: Record<string, BadgeTone> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'rose',
};

function ChangesList({ changes }: { changes: SolicitudChange[] }) {
  return (
    <Card>
      <CardHeader title="Cambios propuestos" />
      <ul className="space-y-3">
        {changes.map((c) => {
          const response = CHANGE_RESPONSE_META[c.client_response];
          return (
            <li key={c.id} className="rounded-xl border border-stone-100 bg-stone-50/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-900">
                  {CHANGE_TYPE_LABELS[c.change_type] ?? c.change_type}
                </p>
                <Badge tone={RESPONSE_TONES[c.client_response] ?? 'gray'} dot>
                  {response.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-stone-600">
                {c.original_value && (
                  <>
                    <span className="line-through">{c.original_value}</span>
                    {' → '}
                  </>
                )}
                <span className="font-medium">{c.proposed_value}</span>
              </p>
              {c.reason && <p className="mt-1 text-xs text-stone-500">{c.reason}</p>}
              <p className="mt-1 text-xs text-stone-400">
                {formatDateTime(c.created_at)}
                {c.client_responded_at && <> · respondido {formatDateTime(c.client_responded_at)}</>}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function StatusHistory({ log }: { log: StatusLogEntry[] }) {
  return (
    <Card>
      <CardHeader title="Historial de estados" />
      {log.length === 0 ? (
        <p className="text-sm text-stone-400">Sin movimientos registrados.</p>
      ) : (
        <ul className="space-y-2">
          {log.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-36 shrink-0 text-xs tabular-nums text-stone-400">
                {formatDateTime(entry.changed_at)}
              </span>
              {entry.from_status && (
                <span className="text-xs text-stone-400">
                  {SOLICITUD_STATUS_META[entry.from_status].label} →
                </span>
              )}
              <SolicitudStatusBadge status={entry.to_status} />
              {entry.actor_name && (
                <span className="text-xs text-stone-500">por {entry.actor_name}</span>
              )}
              {entry.note && <span className="text-xs text-stone-400">· {entry.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
