'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { markFit, markNotFit, saveNotes } from '@/lib/candidates/actions';
import { RestoreTalentControl } from '@/components/talent/RestoreTalentControl';
import { ReactivateButton } from '@/components/ReactivateButton';
import { MetroAssignControl } from '@/components/MetroAssignControl';
import { formatDate, fullName } from '@/lib/format';
import type { Candidate } from '@/lib/candidates/queries';

// Fit/not-fit decisions belong to the HM while a candidate is still in the
// vetting phase. Past that, the decision is Julia's (Step 6).
const HM_ACTIONABLE = new Set(['new', 'scheduled', 'in_review']);

export function CandidateCard({ candidate, metros }: { candidate: Candidate; metros: string[] }) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(candidate.notes ?? '');
  const [savedNote, setSavedNote] = useState(candidate.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const showHmActions = HM_ACTIONABLE.has(candidate.status);
  const notesDirty = notes !== savedNote;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? 'Algo salió mal');
    });
  }

  function onMarkFit() {
    if (confirm(`¿Marcar a ${candidate.first_name} como FIT? Se enviará el correo para agendar con Julia.`))
      run(() => markFit(candidate.id));
  }

  function onMarkNotFit() {
    if (confirm(`¿Marcar a ${candidate.first_name} como NO FIT? Se enviará el correo de rechazo.`))
      run(() => markNotFit(candidate.id));
  }

  function onSaveNotes() {
    run(async () => {
      const res = await saveNotes(candidate.id, notes);
      if (res.ok) setSavedNote(notes);
      return res;
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/dashboard/candidates/${candidate.id}`}
            className="font-semibold text-gray-900 hover:text-blue-700 hover:underline"
          >
            {fullName(candidate.first_name, candidate.last_name)}
          </Link>
          <p className="mt-0.5 text-sm text-gray-500">
            {candidate.metro_area ?? candidate.city ?? 'Sin metro asignado'}
            {candidate.state ? ` · ${candidate.state}` : ''}
          </p>
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              candidate.resume_uploaded_at
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {candidate.resume_uploaded_at ? 'CV ✓' : 'CV pendiente'}
          </span>
        </div>
        <StatusBadge status={candidate.status} />
      </div>

      {candidate.metro_area === null && (
        <div className="mt-2">
          <MetroAssignControl
            candidateId={candidate.id}
            current={candidate.metro_area}
            metros={metros}
            size="sm"
          />
        </div>
      )}

      <dl className="mt-3 space-y-1 text-sm text-gray-600">
        <div className="flex gap-2">
          <dt className="text-gray-400">Email</dt>
          <dd className="truncate">{candidate.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-400">Teléfono</dt>
          <dd>{candidate.phone ?? '—'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-400">Recibido</dt>
          <dd>{formatDate(candidate.created_at)}</dd>
        </div>
      </dl>

      <div className="mt-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas de la llamada…"
          rows={2}
          className="w-full resize-y rounded-lg border border-gray-200 p-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        {notesDirty && (
          <button
            onClick={onSaveNotes}
            disabled={pending}
            className="mt-1 text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
          >
            Guardar notas
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {showHmActions && (
          <>
            <button
              onClick={onMarkFit}
              disabled={pending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Marcar como fit
            </button>
            <button
              onClick={onMarkNotFit}
              disabled={pending}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              No es un fit
            </button>
          </>
        )}
        {showHmActions && (
          <Link
            href={`/dashboard/candidates/${candidate.id}/scorecard`}
            className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Scorecard
          </Link>
        )}
        {candidate.status === 'removed' && <RestoreTalentControl prefill={candidate} size="sm" />}
        {candidate.status === 'archived' && (
          <ReactivateButton candidateId={candidate.id} candidateName={candidate.first_name} size="sm" />
        )}
        <Link
          href={`/dashboard/candidates/${candidate.id}`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Ver perfil
        </Link>
      </div>
    </div>
  );
}
