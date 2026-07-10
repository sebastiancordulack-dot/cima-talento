import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { JuliaActions } from '@/components/JuliaActions';
import { MAX_SCORE, verdictForScore, VERDICT_META } from '@/lib/scorecard/questions';
import { formatDate, fullName } from '@/lib/format';
import type { Candidate } from '@/lib/candidates/queries';

export function JuliaCandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/dashboard/candidates/${candidate.id}`}
            className="text-lg font-semibold text-stone-900 hover:text-brand-700 hover:underline"
          >
            {fullName(candidate.first_name, candidate.last_name)}
          </Link>
          <p className="mt-0.5 text-sm text-stone-500">
            {candidate.metro_area ?? candidate.city ?? 'Sin metro asignado'}
            {candidate.state ? ` · ${candidate.state}` : ''} · {candidate.email}
          </p>
        </div>
        <StatusBadge status={candidate.status} />
      </div>

      {/* HM scorecard outcome */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-sm text-stone-500">Puntaje de la entrevista</span>
        <span className="text-base font-semibold tabular-nums text-stone-900">
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
        <span className="text-xs text-stone-400">Recibido {formatDate(candidate.created_at)}</span>
      </div>

      {/* HM notes */}
      <div className="mt-3 rounded-xl bg-stone-50 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Notas del entrevistador</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
          {candidate.notes ?? 'Sin notas.'}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <JuliaActions candidateId={candidate.id} candidateName={candidate.first_name} size="sm" />
        <Link
          href={`/dashboard/candidates/${candidate.id}`}
          className="shrink-0 text-sm font-medium text-brand-700 hover:underline"
        >
          Ver perfil completo →
        </Link>
      </div>
    </div>
  );
}
