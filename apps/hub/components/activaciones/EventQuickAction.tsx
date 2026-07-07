'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setSolicitudStatus } from '@/modules/activaciones/actions';
import type { SolicitudStatus } from '@cima/db';

// The tracker's quick action (Brief §12.3): the one legal forward move —
// confirmed → "Iniciar ejecución", in_progress → "Marcar completada".
export function EventQuickAction({
  solicitudId,
  status,
}: {
  solicitudId: string;
  status: SolicitudStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const action =
    status === 'confirmed'
      ? { to: 'in_progress' as SolicitudStatus, label: 'Iniciar ejecución', confirm: '¿Marcar el evento como en curso?' }
      : status === 'in_progress'
        ? { to: 'completed' as SolicitudStatus, label: 'Marcar completada', confirm: '¿Marcar la activación como completada?' }
        : null;
  if (!action) return null;

  function run() {
    if (!action || !window.confirm(action.confirm)) return;
    setError(null);
    start(async () => {
      const res = await setSolicitudStatus(solicitudId, action.to);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No se pudo actualizar.');
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={pending}
        className="rounded-lg border border-green-600 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
      >
        {action.label}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
