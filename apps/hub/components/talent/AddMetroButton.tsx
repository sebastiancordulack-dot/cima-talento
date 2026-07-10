'use client';

import { useState } from 'react';
import { AddMetroForm } from '@/components/talent/AddMetroForm';

export function AddMetroButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-card transition-colors hover:bg-stone-50"
      >
        + Agregar metro
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/40 p-4">
          <div className="mt-10 w-full max-w-xl">
            <AddMetroForm onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
