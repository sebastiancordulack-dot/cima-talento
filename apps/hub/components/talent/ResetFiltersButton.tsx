'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// Every talent-pool filter key that lives in the URL (set by the map dots and
// the filter bar). Reset wipes all of them; `tab` and anything else is kept.
const FILTER_KEYS = ['metro', 'state', 'active', 'onboarding', 'bilingual', 'experience'];

export function ResetFiltersButton({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Only render when there's something to clear.
  const hasFilters = FILTER_KEYS.some((k) => params.get(k));
  if (!hasFilters) return null;

  function reset() {
    const next = new URLSearchParams(params.toString());
    for (const k of FILTER_KEYS) next.delete(k);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <button
      type="button"
      onClick={reset}
      className={
        className ??
        'inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 shadow-card transition-colors hover:bg-stone-50'
      }
    >
      <span aria-hidden>×</span> Limpiar filtros
    </button>
  );
}
