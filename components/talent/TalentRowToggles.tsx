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
        active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
        complete ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
      }`}
      title="Cambiar estado de onboarding"
    >
      {complete ? 'Onboarding ✓' : 'Onboarding pendiente'}
    </button>
  );
}
