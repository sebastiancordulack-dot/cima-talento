'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadResume } from '@/lib/candidates/resume-actions';
import { RESUME_ACCEPT, MAX_RESUME_BYTES, isAllowedResume } from '@/lib/candidates/resume-constants';

export function ResumeUpload({
  token,
  firstName,
  alreadyUploaded,
  filename,
  calendlyLink,
}: {
  token: string;
  firstName: string;
  alreadyUploaded: boolean;
  filename: string | null;
  calendlyLink: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(alreadyUploaded);
  const [savedName, setSavedName] = useState(filename);
  const [picked, setPicked] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onPick(file: File | null) {
    setError(null);
    if (!file) return setPicked(null);
    if (!isAllowedResume(file.name)) {
      setPicked(null);
      return setError('Solo se permiten archivos PDF o Word (.pdf, .doc, .docx).');
    }
    if (file.size > MAX_RESUME_BYTES) {
      setPicked(null);
      return setError('El archivo supera el límite de 10 MB.');
    }
    setPicked(file);
  }

  function submit() {
    if (!picked) return;
    setError(null);
    const fd = new FormData();
    fd.append('file', picked);
    start(async () => {
      const res = await uploadResume(token, fd);
      if (res.ok) {
        setSavedName(picked.name);
        setPicked(null);
        setDone(true);
      } else {
        setError(res.error ?? 'No se pudo subir el archivo.');
      }
    });
  }

  // ---- Success / scheduling step --------------------------------------------
  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-3xl text-brand-700">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-stone-900">¡Listo, {firstName}!</h1>
        <p className="mt-2 text-sm text-stone-600">
          Recibimos tu currículum{savedName ? <> (<span className="font-medium">{savedName}</span>)</> : ''}.
          El último paso es agendar tu llamada.
        </p>

        {calendlyLink ? (
          <a
            href={calendlyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block w-full rounded-xl bg-stone-900 px-5 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-stone-700"
          >
            Agendar mi llamada
          </a>
        ) : (
          <p className="mt-6 text-sm text-stone-500">Nuestro equipo te contactará pronto para agendar tu llamada.</p>
        )}

        <button
          onClick={() => {
            setDone(false);
            setTimeout(() => inputRef.current?.click(), 0);
          }}
          className="mt-4 text-xs font-medium text-brand-700 hover:underline"
        >
          Subir otro archivo
        </button>
      </div>
    );
  }

  // ---- Upload step ----------------------------------------------------------
  return (
    <div>
      <h1 className="text-xl font-semibold text-stone-900">Hola {firstName} 👋</h1>
      <p className="mt-2 text-sm text-stone-600">
        Antes de tu llamada, sube tu currículum (CV). Aceptamos PDF o Word. Toma menos de un minuto y
        enseguida podrás agendar tu llamada.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={RESUME_ACCEPT}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 px-5 py-8 text-center text-sm font-medium text-stone-600 transition-colors hover:border-brand-400 hover:bg-brand-50/40"
      >
        {picked ? (
          <span className="text-stone-900">📄 {picked.name}</span>
        ) : (
          <span>Toca aquí para elegir tu archivo</span>
        )}
      </button>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <button
        onClick={submit}
        disabled={!picked || pending}
        className="mt-4 w-full rounded-xl bg-stone-900 px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
      >
        {pending ? 'Subiendo…' : 'Subir currículum'}
      </button>

      <p className="mt-3 text-center text-xs text-stone-400">Tamaño máximo: 10 MB · PDF o Word</p>
    </div>
  );
}
