'use client';

import { useState } from 'react';
import { AddTalentForm } from '@/components/talent/AddTalentForm';

export function AddTalentButton() {
  const [open, setOpen] = useState(false);

  if (open) return <AddTalentForm onDone={() => setOpen(false)} />;

  return (
    <button
      onClick={() => setOpen(true)}
      className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
    >
      + Agregar a la red
    </button>
  );
}
