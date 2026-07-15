import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/StatusBadge';
import { CandidateActions } from '@/components/CandidateActions';
import { CandidateNotes } from '@/components/CandidateNotes';
import { PreviouslyRejectedBadge } from '@/components/PreviouslyRejectedBadge';
import { RestoreTalentControl } from '@/components/talent/RestoreTalentControl';
import { ReactivateButton } from '@/components/ReactivateButton';
import { MetroAssignControl } from '@/components/MetroAssignControl';
import { RoleAssignControl } from '@/components/RoleAssignControl';
import { RoleBadge } from '@/components/RoleBadge';
import { WhatsAppBumpButton } from '@/components/WhatsAppBumpButton';
import { getCandidateProfile } from '@/lib/candidates/queries';
import { getResumeSignedUrl } from '@/lib/candidates/resume';
import { getMetros } from '@/lib/location/metros-store';
import { getSessionUser, isAdminRole } from '@/lib/auth/session';
import { ROLE_LABELS, ROLE_UNCLASSIFIED_LABEL, resumeRequired } from '@/lib/candidates/roles';
import { STATUS_META } from '@/lib/candidates/status';
import {
  HARD_FILTERS,
  SCORED_QUESTIONS,
  BONUS_SIGNALS,
  MAX_SCORE,
  verdictForScore,
  VERDICT_META,
} from '@/lib/scorecard/questions';
import { EMAIL_TYPE_LABELS, EMAIL_STATUS_LABELS } from '@/lib/email/labels';
import { formatDate, formatDateTime, fullName } from '@/lib/format';

export const dynamic = 'force-dynamic';

// --- small presentational helpers -------------------------------------------
function TriState({ value }: { value: boolean | null }) {
  if (value === true) return <span className="font-medium text-green-700">Sí</span>;
  if (value === false) return <span className="font-medium text-rose-700">No</span>;
  return <span className="text-stone-400">Sin capturar</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-stone-900">{title}</h2>
      {children}
    </section>
  );
}

/** Read a per-question score out of scorecard_data, tolerating number or
 *  { score } shapes (the Step 5 entry UI will write one of these). */
function readScore(data: Record<string, unknown>, key: string): number | null {
  const raw = data[key];
  if (typeof raw === 'number') return raw;
  if (raw && typeof raw === 'object' && typeof (raw as { score?: unknown }).score === 'number') {
    return (raw as { score: number }).score;
  }
  return null;
}

export default async function CandidateProfilePage({ params }: { params: { id: string } }) {
  const [profile, user, metroRecords] = await Promise.all([
    getCandidateProfile(params.id),
    getSessionUser(),
    getMetros(),
  ]);
  if (!profile) notFound();
  const { candidate, history, emails } = profile;
  const isAdmin = isAdminRole(user?.hm?.role);
  const metros = metroRecords.map((m) => m.metro).sort();
  const resumeUrl = await getResumeSignedUrl(candidate.resume_path);
  const scorecard = candidate.scorecard_data as Record<string, unknown>;
  const hasScores = SCORED_QUESTIONS.some((q) => readScore(scorecard, q.key) !== null);

  return (
    <div className="space-y-5">
      <Link href="/dashboard" className="text-sm text-stone-400 hover:text-stone-600">
        ← Volver al panel
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white p-5 shadow-card">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            {fullName(candidate.first_name, candidate.last_name)}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {candidate.metro_area ?? candidate.city ?? 'Sin metro asignado'}
            {candidate.state ? ` · ${candidate.state}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <RoleBadge role={candidate.role} />
            <PreviouslyRejectedBadge rejectedAt={candidate.previously_rejected_at} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={candidate.status} />
          {['new', 'scheduled', 'in_review'].includes(candidate.status) && (
            <Link
              href={`/dashboard/candidates/${candidate.id}/scorecard`}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800"
            >
              Completar scorecard
            </Link>
          )}
          <CandidateActions
            candidateId={candidate.id}
            firstName={candidate.first_name}
            status={candidate.status}
            isAdmin={isAdmin}
            size="sm"
            redirectOnDelete="/dashboard"
          />
          {candidate.status === 'removed' && <RestoreTalentControl prefill={candidate} size="sm" />}
          {candidate.status === 'archived' && (
            <ReactivateButton candidateId={candidate.id} candidateName={candidate.first_name} size="sm" />
          )}
          {!candidate.resume_uploaded_at && resumeRequired(candidate.role) && (
            <WhatsAppBumpButton
              candidateId={candidate.id}
              firstName={candidate.first_name}
              phone={candidate.phone}
              uploadToken={candidate.upload_token}
              lastBumpedAt={candidate.last_bumped_at}
              size="sm"
            />
          )}
          <MetroAssignControl
            candidateId={candidate.id}
            current={candidate.metro_area}
            metros={metros}
            size="sm"
          />
          <RoleAssignControl candidateId={candidate.id} current={candidate.role} size="sm" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Contact */}
        <Section title="Contacto">
          <dl className="space-y-2 text-sm">
            <Row label="Email" value={candidate.email} />
            <Row label="Teléfono" value={candidate.phone ?? '—'} />
            <Row label="Ciudad" value={candidate.city ?? '—'} />
            <Row label="Código postal" value={candidate.zip_code ?? '—'} />
            <Row label="Metro" value={candidate.metro_area ?? '—'} />
            <Row label="Estado" value={candidate.state ?? '—'} />
            <Row
              label="Rol"
              value={candidate.role ? ROLE_LABELS[candidate.role] : ROLE_UNCLASSIFIED_LABEL}
            />
            <Row label="Origen del anuncio" value={candidate.source_ad_location ?? '—'} />
            <Row label="Formulario (Meta)" value={candidate.meta_form_name ?? '—'} />
            <Row label="Recibido" value={formatDate(candidate.created_at)} />
          </dl>
        </Section>

        {/* Hard filters */}
        <Section title="Filtros obligatorios">
          <ul className="space-y-2 text-sm">
            {HARD_FILTERS.map((f) => (
              <li key={f.key} className="flex items-start justify-between gap-3">
                <span className="text-stone-600">{f.question}</span>
                <TriState value={candidate[f.field]} />
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Currículum */}
      <Section title="Currículum">
        {candidate.resume_uploaded_at ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <span className="font-medium text-green-700">Recibido</span>
              <span className="text-stone-400"> · {formatDate(candidate.resume_uploaded_at)}</span>
              {candidate.resume_filename && (
                <div className="text-xs text-stone-500">{candidate.resume_filename}</div>
              )}
            </div>
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800"
              >
                Descargar / ver
              </a>
            )}
          </div>
        ) : resumeRequired(candidate.role) ? (
          <p className="text-sm text-amber-700">
            Pendiente — el candidato aún no ha subido su currículum.
          </p>
        ) : (
          <p className="text-sm text-stone-400">
            No requerido — los promotores/as agendan su llamada sin subir CV.
          </p>
        )}
      </Section>

      {/* Scorecard */}
      <Section title="Scorecard de la entrevista">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-stone-500">Puntaje total</span>
          <span className="text-lg font-semibold tabular-nums text-stone-900">
            {candidate.score_total ?? '—'}
            <span className="text-sm font-normal text-stone-400"> / {MAX_SCORE}</span>
          </span>
          {candidate.score_total !== null && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                VERDICT_META[verdictForScore(candidate.score_total)].badgeClass
              }`}
            >
              {VERDICT_META[verdictForScore(candidate.score_total)].label}
            </span>
          )}
        </div>
        {hasScores ? (
          <ul className="divide-y divide-stone-100">
            {SCORED_QUESTIONS.map((q) => {
              const score = readScore(scorecard, q.key);
              return (
                <li key={q.key} className="flex items-start justify-between gap-4 py-2.5">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                      {q.category}
                    </p>
                    <p className="text-sm text-stone-700">{q.question}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-900">
                    {score ?? '—'}<span className="font-normal text-stone-400"> / 3</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">
            Aún no se ha completado el scorecard. (La captura llega en el Paso 5.)
          </p>
        )}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {BONUS_SIGNALS.map((b) => (
            <div key={b.key} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 text-sm">
              <span className="text-stone-600">{b.label}</span>
              <TriState value={candidate[b.field]} />
            </div>
          ))}
        </div>
      </Section>

      {/* Notes — editable inline (comentarios) */}
      <Section title="Notas de la llamada">
        <CandidateNotes candidateId={candidate.id} initialNotes={candidate.notes} rows={4} />
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Status timeline */}
        <Section title="Historial de estatus">
          <ol className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-stone-400">{formatDateTime(h.created_at)}</span>
                <span className="text-stone-700">
                  {h.from_status ? `${STATUS_META[h.from_status].label} → ` : ''}
                  <span className="font-medium">{STATUS_META[h.to_status].label}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        {/* Email log */}
        <Section title="Correos enviados">
          {emails.length === 0 ? (
            <p className="text-sm text-stone-400">No se han enviado correos.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {emails.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <span className="text-stone-700">{EMAIL_TYPE_LABELS[e.email_type]}</span>
                  <span className="flex items-center gap-2 text-stone-400">
                    {formatDateTime(e.sent_at)}
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        e.status === 'failed'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {EMAIL_STATUS_LABELS[e.status]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-400">{label}</dt>
      <dd className="text-right text-stone-700">{value}</dd>
    </div>
  );
}
