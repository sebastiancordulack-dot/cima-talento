'use client';

import { useState, useTransition } from 'react';
import { approveCandidate, doNotAdvanceCandidate } from '@/lib/candidates/actions';

export function JuliaActions({
  candidateId,
  candidateName,
  size = 'md',
}: {
  candidateId: string;
  candidateName: string;
  size?: 'sm' | 'md';
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? 'Algo salió mal');
    });
  }

  const pad = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            run(
              () => approveCandidate(candidateId),
              `¿Aprobar a ${candidateName}? Se enviará el correo de bienvenida y se agregará a la Red de Talento.`
            )
          }
          disabled={pending}
          className={`rounded-lg bg-green-600 font-medium text-white hover:bg-green-700 disabled:opacity-50 ${pad}`}
        >
          Aprobar
        </button>
        <button
          onClick={() =>
            run(
              () => doNotAdvanceCandidate(candidateId),
              `¿No avanzar a ${candidateName}? Se enviará el correo de cierre del proceso.`
            )
          }
          disabled={pending}
          className={`rounded-lg bg-rose-600 font-medium text-white hover:bg-rose-700 disabled:opacity-50 ${pad}`}
        >
          No avanzar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
