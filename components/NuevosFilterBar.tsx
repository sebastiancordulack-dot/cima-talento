'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { NuevosFilters } from '@/lib/candidates/nuevos-filters';

// Filter bar for the "Nuevos interesados" tab: multi-select metro chips +
// independent CV and Llamada filters + a date sort. State lives in the URL, so
// the view is shareable and survives refresh. Each control rebuilds the full
// query string from the current filters and navigates.
export function NuevosFilterBar({
  availableMetros,
  filters,
  active,
}: {
  availableMetros: string[];
  filters: NuevosFilters;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function navigate(next: NuevosFilters) {
    const p = new URLSearchParams();
    p.set('tab', 'nuevos');
    if (next.metros.length) p.set('metros', next.metros.join(','));
    if (next.cv) p.set('cv', next.cv);
    if (next.llamada) p.set('llamada', next.llamada);
    if (next.sort !== 'antiguos') p.set('sort', next.sort);
    start(() => router.push(`/dashboard?${p.toString()}`));
  }

  function toggleMetro(metro: string) {
    const metros = filters.metros.includes(metro)
      ? filters.metros.filter((m) => m !== metro)
      : [...filters.metros, metro];
    navigate({ ...filters, metros });
  }

  const selectCls =
    'rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400';

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 ${pending ? 'opacity-60' : ''}`}>
      {/* Metro chips (multi-select) */}
      {availableMetros.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Metros</span>
          {availableMetros.map((metro) => {
            const on = filters.metros.includes(metro);
            return (
              <button
                key={metro}
                onClick={() => toggleMetro(metro)}
                className={`rounded-full px-3 py-1 text-sm font-medium ring-1 transition ${
                  on
                    ? 'bg-blue-600 text-white ring-blue-600'
                    : 'bg-white text-gray-700 ring-gray-300 hover:bg-gray-50'
                }`}
              >
                {metro}
              </button>
            );
          })}
        </div>
      )}

      {/* CV / Llamada / Orden + reset */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          CV
          <select
            value={filters.cv ?? ''}
            onChange={(e) => navigate({ ...filters, cv: (e.target.value || null) as NuevosFilters['cv'] })}
            className={selectCls}
          >
            <option value="">Todos</option>
            <option value="con">Con CV</option>
            <option value="sin">Sin CV</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Llamada
          <select
            value={filters.llamada ?? ''}
            onChange={(e) =>
              navigate({ ...filters, llamada: (e.target.value || null) as NuevosFilters['llamada'] })
            }
            className={selectCls}
          >
            <option value="">Todas</option>
            <option value="agendada">Agendada</option>
            <option value="sin">Sin agendar</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Orden
          <select
            value={filters.sort}
            onChange={(e) => navigate({ ...filters, sort: e.target.value as NuevosFilters['sort'] })}
            className={selectCls}
          >
            <option value="antiguos">Más antiguos</option>
            <option value="recientes">Más recientes</option>
          </select>
        </label>

        {active && (
          <button
            onClick={() => start(() => router.push('/dashboard?tab=nuevos'))}
            className="ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
