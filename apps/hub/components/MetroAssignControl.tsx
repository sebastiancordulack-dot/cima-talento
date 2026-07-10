'use client';

import { useState, useTransition } from 'react';
import { assignMetro } from '@/lib/candidates/actions';

// Inline metro picker for routing a candidate (e.g. an unassigned Meta lead) to
// a metro. Selecting a metro submits immediately. Used on the candidate card
// (when unassigned) and on the profile header (to set or change).
export function MetroAssignControl({
  candidateId,
  current,
  metros,
  size = 'md',
}: {
  candidateId: string;
  current: string | null;
  metros: string[];
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
      const res = await assignMetro(candidateId, value);
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
        aria-label="Asignar metro"
      >
        <option value="">{pending ? 'Asignando…' : current ? 'Cambiar metro…' : 'Asignar metro…'}</option>
        {metros.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
