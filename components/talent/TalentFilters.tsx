'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function TalentFilters({ metros, states }: { metros: string[]; states: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === '') next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function toggleBool(key: string, checked: boolean) {
    setParam(key, checked ? 'true' : '');
  }

  const selectClass =
    'rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <select
        value={params.get('metro') ?? ''}
        onChange={(e) => setParam('metro', e.target.value)}
        className={selectClass}
      >
        <option value="">Todos los metros</option>
        {metros.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <select
        value={params.get('state') ?? ''}
        onChange={(e) => setParam('state', e.target.value)}
        className={selectClass}
      >
        <option value="">Todos los estados</option>
        {states.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={params.get('active') ?? ''}
        onChange={(e) => setParam('active', e.target.value)}
        className={selectClass}
      >
        <option value="">Activos e inactivos</option>
        <option value="true">Solo activos</option>
        <option value="false">Solo inactivos</option>
      </select>

      <select
        value={params.get('onboarding') ?? ''}
        onChange={(e) => setParam('onboarding', e.target.value)}
        className={selectClass}
      >
        <option value="">Onboarding: todos</option>
        <option value="true">Onboarding completo</option>
        <option value="false">Onboarding pendiente</option>
      </select>

      <label className="flex items-center gap-1.5 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={params.get('bilingual') === 'true'}
          onChange={(e) => toggleBool('bilingual', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Bilingüe
      </label>

      <label className="flex items-center gap-1.5 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={params.get('experience') === 'true'}
          onChange={(e) => toggleBool('experience', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Con experiencia
      </label>
    </div>
  );
}
