'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { NuevosFilters } from '@/lib/candidates/nuevos-filters';

// Filter bar for the "Nuevos interesados" tab: a multi-select metro dropdown +
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
  const [metroOpen, setMetroOpen] = useState(false);
  const metroRef = useRef<HTMLDivElement>(null);

  // Close the metro dropdown on an outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (metroRef.current && !metroRef.current.contains(e.target as Node)) setMetroOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

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

  const metroSummary =
    filters.metros.length === 0
      ? 'Todos los metros'
      : filters.metros.length === 1
        ? filters.metros[0]
        : `${filters.metros.length} metros`;

  const selectCls =
    'rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400';

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Metros — multi-select dropdown */}
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Metros
          <div className="relative" ref={metroRef}>
            <button
              type="button"
              onClick={() => setMetroOpen((o) => !o)}
              className={`flex items-center gap-2 ${selectCls} ${
                filters.metros.length ? 'font-medium text-blue-700' : ''
              }`}
            >
              <span>{metroSummary}</span>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </button>
            {metroOpen && (
              <div className="absolute left-0 z-20 mt-1 max-h-72 w-60 overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                {availableMetros.map((metro) => (
                  <label
                    key={metro}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={filters.metros.includes(metro)}
                      onChange={() => toggleMetro(metro)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                    />
                    {metro}
                  </label>
                ))}
                {filters.metros.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate({ ...filters, metros: [] })}
                    className="mt-1 w-full rounded px-2 py-1.5 text-left text-xs font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Limpiar metros
                  </button>
                )}
              </div>
            )}
          </div>
        </label>

        {/* CV */}
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

        {/* Llamada */}
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

        {/* Orden */}
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
