'use client';

import { useState } from 'react';
import { AddTalentForm, type TalentPrefill } from '@/components/talent/AddTalentForm';
import { fullName } from '@/lib/format';

// Shown only for candidates with status `removed`. Reuses the add form (which
// dedups on email) to put the person back in the pool as `approved`.
export function RestoreTalentControl({
  prefill,
  size = 'md',
}: {
  prefill: TalentPrefill;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const name = fullName(prefill.first_name ?? '', prefill.last_name ?? null);
  const pad = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded-lg bg-green-600 font-medium text-white hover:bg-green-700 ${pad}`}
      >
        Restaurar a la red
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-10 w-full max-w-xl">
            <AddTalentForm
              initial={prefill}
              lockEmail
              title={`Restaurar a la Red de Talento — ${name}`}
              submitLabel="Restaurar a la red"
              onDone={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
