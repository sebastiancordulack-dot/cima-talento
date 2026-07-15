'use client';

// Every pipeline decision for a candidate, in one component, gated by status
// and role — rendered on both the dashboard card and the profile page so the
// two surfaces can never drift again:
//
//   new / scheduled / in_review     → Marcar como fit · No es un fit (any staff)
//   advanced / julia_scheduled      → Aprobar · No avanzar (admin/Julia only)
//   any active status               → Archivar para después (any staff)
//   Archivo statuses                → Eliminar definitivamente (any staff)
//
// Rejections and Archivo purges permanently DELETE the candidate (migration
// 0011); their dialogs say so and use the danger tone. Archive and rejection
// emails are optional via the dialog checkbox.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveCandidate,
  archiveCandidate,
  deleteFromArchive,
  doNotAdvanceCandidate,
  markFit,
  markNotFit,
} from '@/lib/candidates/actions';
import { ConfirmDialog, type ConfirmDialogProps } from '@/components/ConfirmDialog';
import type { CandidateStatus } from '@cima/db';

const VETTING = new Set<CandidateStatus>(['new', 'scheduled', 'in_review']);
const JULIA_STAGE = new Set<CandidateStatus>(['advanced', 'julia_scheduled']);
const ARCHIVO = new Set<CandidateStatus>(['archived', 'rejected_hm', 'rejected_julia', 'no_show', 'removed']);

type DialogKind = 'fit' | 'notFit' | 'approve' | 'noAdvance' | 'archive' | 'purge';

export function CandidateActions({
  candidateId,
  firstName,
  status,
  isAdmin,
  size = 'md',
  redirectOnDelete,
}: {
  candidateId: string;
  firstName: string;
  status: CandidateStatus;
  isAdmin: boolean;
  size?: 'sm' | 'md';
  /** Where to navigate after the candidate is deleted (used by the profile
   *  page, which would otherwise 404). Cards omit it — revalidation removes
   *  the card in place. */
  redirectOnDelete?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pad = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-3.5 py-2 text-sm';

  function run(action: () => Promise<{ ok: boolean; error?: string }>, deletes: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? 'Algo salió mal');
        setDialog(null);
        return;
      }
      setDialog(null);
      if (deletes && redirectOnDelete) router.push(redirectOnDelete);
    });
  }

  const deletionWarning = `Esta acción es permanente: se eliminarán todos los datos de ${firstName} de la plataforma (perfil, CV, historial y correos).`;

  const DIALOGS: Record<DialogKind, Omit<ConfirmDialogProps, 'open' | 'pending' | 'onCancel'>> = {
    fit: {
      title: `¿Marcar a ${firstName} como fit?`,
      message: 'Se enviará el correo para agendar la llamada con Julia.',
      confirmLabel: 'Marcar como fit',
      tone: 'primary',
      onConfirm: () => run(() => markFit(candidateId), false),
    },
    notFit: {
      title: `¿${firstName} no es un fit?`,
      message: deletionWarning,
      confirmLabel: 'Rechazar y eliminar',
      tone: 'danger',
      emailLabel: 'Enviar correo de rechazo al candidato',
      onConfirm: ({ sendEmail }) => run(() => markNotFit(candidateId, { sendEmail }), true),
    },
    approve: {
      title: `¿Aprobar a ${firstName}?`,
      message: 'Se enviará el correo de bienvenida y se agregará a la Red de Talento.',
      confirmLabel: 'Aprobar',
      tone: 'primary',
      onConfirm: () => run(() => approveCandidate(candidateId), false),
    },
    noAdvance: {
      title: `¿No avanzar a ${firstName}?`,
      message: deletionWarning,
      confirmLabel: 'Rechazar y eliminar',
      tone: 'danger',
      emailLabel: 'Enviar correo de cierre del proceso al candidato',
      onConfirm: ({ sendEmail }) => run(() => doNotAdvanceCandidate(candidateId, { sendEmail }), true),
    },
    archive: {
      title: `¿Archivar a ${firstName} para después?`,
      message: 'Pasará al Archivo — la reserva de personas con potencial para contactar si surge una oportunidad.',
      confirmLabel: 'Archivar',
      tone: 'sky',
      emailLabel: 'Enviar correo al candidato (quedamos en contacto)',
      onConfirm: ({ sendEmail }) => run(() => archiveCandidate(candidateId, { sendEmail }), false),
    },
    purge: {
      title: `¿Eliminar definitivamente a ${firstName}?`,
      message: `${deletionWarning}\nNo se enviará ningún correo.`,
      confirmLabel: 'Eliminar definitivamente',
      tone: 'danger',
      onConfirm: () => run(() => deleteFromArchive(candidateId), true),
    },
  };

  const showFit = VETTING.has(status);
  const showJulia = isAdmin && JULIA_STAGE.has(status);
  const showArchive = VETTING.has(status) || JULIA_STAGE.has(status);
  const showPurge = ARCHIVO.has(status);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {showFit && (
          <>
            <button
              onClick={() => setDialog('fit')}
              disabled={pending}
              className={`rounded-xl bg-green-600 font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-50 ${pad}`}
            >
              Marcar como fit
            </button>
            <button
              onClick={() => setDialog('notFit')}
              disabled={pending}
              className={`rounded-xl bg-rose-600 font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50 ${pad}`}
            >
              No es un fit
            </button>
          </>
        )}
        {showJulia && (
          <>
            <button
              onClick={() => setDialog('approve')}
              disabled={pending}
              className={`rounded-xl bg-green-600 font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-50 ${pad}`}
            >
              Aprobar
            </button>
            <button
              onClick={() => setDialog('noAdvance')}
              disabled={pending}
              className={`rounded-xl bg-rose-600 font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50 ${pad}`}
            >
              No avanzar
            </button>
          </>
        )}
        {showArchive && (
          <button
            onClick={() => setDialog('archive')}
            disabled={pending}
            className={`rounded-xl bg-sky-600 font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50 ${pad}`}
          >
            Archivar para después
          </button>
        )}
        {showPurge && (
          <button
            onClick={() => setDialog('purge')}
            disabled={pending}
            className={`rounded-xl border border-rose-200 bg-white font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50 ${pad}`}
          >
            Eliminar definitivamente
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {dialog && (
        <ConfirmDialog
          open
          pending={pending}
          onCancel={() => setDialog(null)}
          {...DIALOGS[dialog]}
        />
      )}
    </div>
  );
}
