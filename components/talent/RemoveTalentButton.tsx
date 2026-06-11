'use client';

import { useState, useTransition } from 'react';
import { removeTalentMember } from '@/lib/talent/actions';

export function RemoveTalentButton({ talentId, name }: { talentId: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);

  function remove() {
    if (!confirm(`¿Quitar a ${name} de la Red de Talento? Pasará al Archivo (puedes volver a agregarlo después).`)) return;
    start(async () => {
      const res = await removeTalentMember(talentId);
      if (!res.ok) setError(true);
    });
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      title="Quitar de la red de talento"
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium disabled:opacity-50 ${
        error ? 'bg-rose-200 text-rose-800' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
      }`}
    >
      Quitar
    </button>
  );
}
