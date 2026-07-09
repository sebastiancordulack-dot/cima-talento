'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses } from '@cima/ui';
import { setReviewer, setSolicitudStatus } from '@/modules/activaciones/actions';
import { MANUAL_STATUS_ACTIONS } from '@/modules/activaciones/status';
import type { SolicitudStatus } from '@cima/db';

// Soft danger stays custom: most statuses offer 1 advance + 2 destructive
// actions, and a row of solid red would shout (spec §4.1).
const DANGER_CLASS =
  'inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 disabled:pointer-events-none disabled:opacity-50';

const TONE_CLASS = {
  primary: buttonClasses('primary'),
  neutral: buttonClasses('secondary'),
  danger: DANGER_CLASS,
} as const;

// Manual status progression with confirmation prompts (Brief §12.2). Only the
// transitions valid from the current status render (§8 map).
export function StatusControls({
  solicitudId,
  status,
}: {
  solicitudId: string;
  status: SolicitudStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actions = MANUAL_STATUS_ACTIONS[status];

  if (actions.length === 0) return null;

  function run(to: SolicitudStatus, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const res = await setSolicitudStatus(solicitudId, to);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No se pudo cambiar el estado.');
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button
          key={a.to}
          onClick={() => run(a.to, a.confirm)}
          disabled={pending}
          className={TONE_CLASS[a.tone]}
        >
          {a.label}
        </button>
      ))}
      {status === 'in_review' && (
        <span className="text-xs text-stone-400">
          Para avanzar: envía la cotización o propone un cambio (más abajo).
        </span>
      )}
      {error && <span className="text-sm text-rose-600">{error}</span>}
    </div>
  );
}

/** Take / release ownership of the request ("Asignada a" in the queue). */
export function ReviewerControl({
  solicitudId,
  reviewerName,
}: {
  solicitudId: string;
  reviewerName: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle(take: boolean) {
    start(async () => {
      const res = await setReviewer(solicitudId, take);
      if (res.ok) router.refresh();
    });
  }

  return reviewerName ? (
    <span className="inline-flex items-center gap-2 text-sm text-stone-500">
      Gestiona: <span className="font-medium text-stone-800">{reviewerName}</span>
      <button
        onClick={() => toggle(false)}
        disabled={pending}
        className="text-xs text-stone-400 underline hover:text-stone-600 disabled:opacity-50"
      >
        soltar
      </button>
    </span>
  ) : (
    <button onClick={() => toggle(true)} disabled={pending} className={buttonClasses('secondary')}>
      Tomar solicitud
    </button>
  );
}
