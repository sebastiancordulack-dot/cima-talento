'use client';

// Inline editable call notes (comentarios) — shared by the dashboard card and
// the profile page. Saves via the saveNotes action; no status change, no email.
import { useState, useTransition } from 'react';
import { controlClasses } from '@cima/ui';
import { saveNotes } from '@/lib/candidates/actions';

export function CandidateNotes({
  candidateId,
  initialNotes,
  rows = 2,
}: {
  candidateId: string;
  initialNotes: string | null;
  rows?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [savedNote, setSavedNote] = useState(initialNotes ?? '');
  const [error, setError] = useState<string | null>(null);

  const dirty = notes !== savedNote;

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveNotes(candidateId, notes);
      if (res.ok) setSavedNote(notes);
      else setError(res.error ?? 'Algo salió mal');
    });
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas de la llamada…"
        rows={rows}
        className={controlClasses('w-full resize-y')}
      />
      {dirty && (
        <button
          onClick={onSave}
          disabled={pending}
          className="mt-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
        >
          Guardar notas
        </button>
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
