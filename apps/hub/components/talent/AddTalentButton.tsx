'use client';

import { useState } from 'react';
import { AddTalentForm } from '@/components/talent/AddTalentForm';

export function AddTalentButton() {
  const [open, setOpen] = useState(false);

  if (open) return <AddTalentForm onDone={() => setOpen(false)} />;

  return (
    <button
      onClick={() => setOpen(true)}
      className="rounded-xl bg-brand-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
    >
      + Agregar a la red
    </button>
  );
}
