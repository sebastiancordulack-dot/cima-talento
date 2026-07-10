'use client';

import { useState } from 'react';
import { AddTalentForm } from '@/components/talent/AddTalentForm';

export function AddTalentButton() {
  const [open, setOpen] = useState(false);

  if (open) return <AddTalentForm onDone={() => setOpen(false)} />;

  return (
    <button
      onClick={() => setOpen(true)}
      className="rounded-xl bg-stone-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
    >
      + Agregar a la red
    </button>
  );
}
