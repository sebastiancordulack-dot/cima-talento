'use client';

import { useState, useTransition } from 'react';
import { reactivateCandidate } from '@/lib/candidates/actions';

// Shown only for `archived` candidates. Reopens them into the active pipeline
// (→ En revisión) so they can be run through to approval when a need arises.
export function ReactivateButton({
  candidateId,
  candidateName,
  size = 'md',
}: {
  candidateId: string;
  candidateName: string;
  size?: 'sm' | 'md';
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pad = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';

  function onClick() {
    if (!confirm(`¿Reactivar a ${candidateName}? Volverá al proceso (En revisión) para continuar su evaluación.`))
      return;
    setError(null);
    start(async () => {
      const res = await reactivateCandidate(candidateId);
      if (!res.ok) setError(res.error ?? 'Algo salió mal');
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={onClick}
        disabled={pending}
        className={`rounded-xl bg-sky-600 font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50 ${pad}`}
      >
        {pending ? 'Reactivando…' : 'Reactivar'}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
