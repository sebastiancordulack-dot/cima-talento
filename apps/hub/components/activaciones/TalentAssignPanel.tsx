'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { controlClasses } from '@cima/ui';
import { assignTalent, unassignTalent } from '@/modules/activaciones/actions';
import type { AssignmentRow, TalentOption } from '@/modules/activaciones/queries';
import { formatAvailability, fullName } from '@/lib/format';

// Talent assignment (Brief §12.2, §16): search the active pool, suggested
// metro (derived from the event address) surfaced first, availability shown
// per person. The DB conflict guard hard-blocks same-date double assignment —
// its message surfaces here.
export function TalentAssignPanel({
  solicitudId,
  assigned,
  options,
  suggestedMetro,
  enabled,
}: {
  solicitudId: string;
  assigned: AssignmentRow[];
  options: TalentOption[];
  suggestedMetro: string | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.talent.id)), [assigned]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return options.filter((o) => {
      if (assignedIds.has(o.id)) return false;
      if (!needle) return true;
      const name = fullName(o.candidates.first_name, o.candidates.last_name).toLowerCase();
      return name.includes(needle) || (o.metro_area ?? '').toLowerCase().includes(needle);
    });
  }, [options, assignedIds, q]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No se pudo completar la acción.');
    });
  }

  return (
    <section className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Talento asignado</h2>
        {suggestedMetro && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            Metro sugerido: {suggestedMetro}
          </span>
        )}
      </div>

      {assigned.length > 0 ? (
        <ul className="mt-2 divide-y divide-stone-100/70">
          {assigned.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {fullName(a.talent.candidates.first_name, a.talent.candidates.last_name)}
                  {!a.talent.active && (
                    <span className="ml-1.5 rounded bg-stone-100 px-1 py-0.5 text-[10px] text-stone-500">
                      inactivo
                    </span>
                  )}
                </p>
                <p className="text-xs text-stone-400">
                  {a.talent.metro_area ?? 'Sin metro'} · {formatAvailability(a.talent.availability)}
                  {a.talent.candidates.phone && <> · {a.talent.candidates.phone}</>}
                </p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('¿Quitar a esta persona del evento?')) {
                    run(() => unassignTalent(solicitudId, a.id));
                  }
                }}
                disabled={pending}
                className="text-stone-300 transition-colors hover:text-rose-500 disabled:opacity-50"
                aria-label="Quitar asignación"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-400">Nadie asignado todavía.</p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {enabled ? (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <input
            className={controlClasses('w-full')}
            placeholder="Buscar por nombre o metro…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="mt-2 max-h-64 divide-y divide-stone-100/70 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="py-3 text-center text-sm text-stone-400">Sin resultados en la red activa.</li>
            )}
            {filtered.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm text-stone-800">
                    {fullName(o.candidates.first_name, o.candidates.last_name)}
                    {suggestedMetro && o.metro_area === suggestedMetro && (
                      <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                        {suggestedMetro}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-stone-400">
                    {o.metro_area ?? 'Sin metro'} · {formatAvailability(o.availability)}
                  </p>
                </div>
                <button
                  onClick={() => run(() => assignTalent(solicitudId, o.id))}
                  disabled={pending}
                  className="rounded-lg border border-brand-300 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-50"
                >
                  Asignar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">
          La asignación de talento se habilita cuando el evento está confirmado (§16).
        </p>
      )}
    </section>
  );
}
