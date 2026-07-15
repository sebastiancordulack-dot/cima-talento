'use client';

import { useState, useTransition } from 'react';
import { assignRole } from '@/lib/candidates/actions';
import { CANDIDATE_ROLES, ROLE_LABELS } from '@/lib/candidates/roles';
import type { CandidateRole } from '@cima/db';

// Inline role picker (mercaderista / promotor-a) mirroring MetroAssignControl.
// Used on the profile header and on cards of unclassified candidates.
export function RoleAssignControl({
  candidateId,
  current,
  size = 'md',
}: {
  candidateId: string;
  current: CandidateRole | null;
  size?: 'sm' | 'md';
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm';
  const select = `rounded-lg border border-stone-200 bg-white text-stone-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 ${pad}`;

  function onPick(value: string) {
    if (!value || value === current) return;
    setError(null);
    start(async () => {
      const res = await assignRole(candidateId, value as CandidateRole);
      if (!res.ok) setError(res.error ?? 'No se pudo asignar.');
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <select
        value={current ?? ''}
        disabled={pending}
        onChange={(e) => onPick(e.target.value)}
        className={select}
        aria-label="Asignar rol"
      >
        <option value="">{pending ? 'Asignando…' : current ? 'Cambiar rol…' : 'Asignar rol…'}</option>
        {CANDIDATE_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
