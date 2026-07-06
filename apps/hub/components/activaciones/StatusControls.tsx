'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setReviewer, setSolicitudStatus } from '@/modules/activaciones/actions';
import { MANUAL_STATUS_ACTIONS } from '@/modules/activaciones/status';
import type { SolicitudStatus } from '@cima/db';

const TONE_CLASS = {
  primary: 'bg-green-600 text-white hover:bg-green-700',
  neutral: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
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
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${TONE_CLASS[a.tone]}`}
        >
          {a.label}
        </button>
      ))}
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
    <span className="inline-flex items-center gap-2 text-sm text-gray-500">
      Gestiona: <span className="font-medium text-gray-800">{reviewerName}</span>
      <button
        onClick={() => toggle(false)}
        disabled={pending}
        className="text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-50"
      >
        soltar
      </button>
    </span>
  ) : (
    <button
      onClick={() => toggle(true)}
      disabled={pending}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      Tomar solicitud
    </button>
  );
}
