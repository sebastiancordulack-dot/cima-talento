'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { proposeChange } from '@/modules/activaciones/actions';
import { CHANGE_TYPE_LABELS } from '@/modules/activaciones/status';

const input =
  'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500';
const label = 'mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400';

// Propose a change to the client (Brief §12.2): transitions the Solicitud to
// changes_proposed; the client approves/rejects inside the portal — never over
// email (§2). Nudge email fires from the transition hook (Step 5).
export function ProposeChangeForm({ solicitudId }: { solicitudId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ change_type: 'date_change', original_value: '', proposed_value: '', reason: '' });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  function submit() {
    setError(null);
    if (!window.confirm('¿Enviar la propuesta de cambio al cliente? La solicitud pasará a “Cambio propuesto”.')) {
      return;
    }
    start(async () => {
      const res = await proposeChange(solicitudId, f);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No se pudo proponer el cambio.');
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">Proponer un cambio</h2>
      <p className="mb-3 text-xs text-gray-500">
        El cliente lo aprueba o rechaza dentro del portal — sin hilos de correo.
      </p>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={label}>Tipo</label>
            <select className={input} value={f.change_type}
              onChange={(e) => set('change_type', e.target.value)}>
              {Object.entries(CHANGE_TYPE_LABELS).map(([value, l]) => (
                <option key={value} value={value}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Valor original</label>
            <input className={input} placeholder="p. ej. 18 jul 2026" value={f.original_value}
              onChange={(e) => set('original_value', e.target.value)} />
          </div>
          <div>
            <label className={label}>Valor propuesto</label>
            <input className={input} placeholder="p. ej. 25 jul 2026" value={f.proposed_value}
              onChange={(e) => set('proposed_value', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={label}>Motivo (visible para el cliente)</label>
          <textarea rows={2} className={input} value={f.reason}
            onChange={(e) => set('reason', e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={submit} disabled={pending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
            Enviar al cliente
          </button>
          {error && <span className="text-sm text-rose-600">{error}</span>}
        </div>
      </div>
    </section>
  );
}
