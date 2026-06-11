'use client';

import { useState } from 'react';
import { AddMetroForm } from '@/components/talent/AddMetroForm';

export function AddMetroButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        + Agregar metro
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-10 w-full max-w-xl">
            <AddMetroForm onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
