'use client';

// Confirmation modal for candidate actions, replacing window.confirm(). Two
// jobs the browser dialog couldn't do:
//   • an "Enviar correo al candidato" checkbox (default ON) for transitions
//     whose email is now optional — archive and both rejections
//   • a danger tone for irreversible actions (reject = permanent delete)
import { useEffect, useRef, useState } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Body copy. Use `\n` for paragraph breaks. */
  message: string;
  confirmLabel: string;
  /** danger = red (destructive), primary = brand, sky = archive. */
  tone?: 'danger' | 'primary' | 'sky';
  /** When set, shows the email checkbox (default checked) with this label. */
  emailLabel?: string;
  pending?: boolean;
  onConfirm: (opts: { sendEmail: boolean }) => void;
  onCancel: () => void;
}

const TONE_CLASSES: Record<NonNullable<ConfirmDialogProps['tone']>, string> = {
  danger: 'bg-rose-600 hover:bg-rose-500',
  primary: 'bg-brand-700 hover:bg-brand-800',
  sky: 'bg-sky-600 hover:bg-sky-500',
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'primary',
  emailLabel,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [sendEmail, setSendEmail] = useState(true);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Re-check the box each time the dialog opens and focus the confirm button.
  useEffect(() => {
    if (open) {
      setSendEmail(true);
      confirmRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      onClick={() => !pending && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        {message.split('\n').map((line, i) => (
          <p key={i} className="mt-2 text-sm text-stone-600">
            {line}
          </p>
        ))}

        {emailLabel && (
          <label className="mt-4 flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-700"
            />
            <span>{emailLabel}</span>
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            onClick={() => onConfirm({ sendEmail: emailLabel ? sendEmail : true })}
            disabled={pending}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${TONE_CLASSES[tone]}`}
          >
            {pending ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
