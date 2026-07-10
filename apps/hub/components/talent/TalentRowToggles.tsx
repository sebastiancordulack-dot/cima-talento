'use client';

import { useTransition } from 'react';
import { setTalentActive, setOnboardingComplete } from '@/lib/talent/actions';

export function ActiveToggle({ talentId, active }: { talentId: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => setTalentActive(talentId, !active).then(() => undefined))}
      disabled={pending}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
      title="Cambiar disponibilidad para asignaciones"
    >
      {active ? 'Activo' : 'Inactivo'}
    </button>
  );
}

export function OnboardingToggle({ talentId, complete }: { talentId: string; complete: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => setOnboardingComplete(talentId, !complete).then(() => undefined))}
      disabled={pending}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        complete ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
      }`}
      title="Cambiar estado de onboarding"
    >
      {complete ? 'Onboarding ✓' : 'Onboarding pendiente'}
    </button>
  );
}
