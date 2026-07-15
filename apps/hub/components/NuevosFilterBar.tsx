'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { buttonClasses, controlClasses } from '@cima/ui';
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
    if (next.rol) p.set('rol', next.rol);
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

  const selectCls = controlClasses();

  return (
    <div
      className={`rounded-2xl border border-stone-200/70 bg-white p-4 shadow-card ${pending ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Metros — multi-select dropdown */}
        <label className="flex items-center gap-1.5 text-sm text-stone-600">
          Metros
          <div className="relative" ref={metroRef}>
            <button
              type="button"
              onClick={() => setMetroOpen((o) => !o)}
              className={`flex items-center gap-2 ${selectCls} ${
                filters.metros.length ? 'font-medium text-brand-700' : ''
              }`}
            >
              <span>{metroSummary}</span>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </button>
            {metroOpen && (
              <div className="absolute left-0 z-20 mt-1 max-h-72 w-60 overflow-auto rounded-xl border border-stone-200 bg-white p-1 shadow-card-hover">
                {availableMetros.map((metro) => (
                  <label
                    key={metro}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    <input
                      type="checkbox"
                      checked={filters.metros.includes(metro)}
                      onChange={() => toggleMetro(metro)}
                      className="size-4 rounded accent-brand-600"
                    />
                    {metro}
                  </label>
                ))}
                {filters.metros.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate({ ...filters, metros: [] })}
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-stone-500 hover:bg-stone-50"
                  >
                    Limpiar metros
                  </button>
                )}
              </div>
            )}
          </div>
        </label>

        {/* Rol */}
        <label className="flex items-center gap-1.5 text-sm text-stone-600">
          Rol
          <select
            value={filters.rol ?? ''}
            onChange={(e) =>
              navigate({ ...filters, rol: (e.target.value || null) as NuevosFilters['rol'] })
            }
            className={selectCls}
          >
            <option value="">Todos</option>
            <option value="mercaderista">Mercaderistas</option>
            <option value="promotor">Promotores/as</option>
            <option value="sin">Sin clasificar</option>
          </select>
        </label>

        {/* CV */}
        <label className="flex items-center gap-1.5 text-sm text-stone-600">
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
        <label className="flex items-center gap-1.5 text-sm text-stone-600">
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
        <label className="flex items-center gap-1.5 text-sm text-stone-600">
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
            className={buttonClasses('secondary', 'md', 'ml-auto')}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
