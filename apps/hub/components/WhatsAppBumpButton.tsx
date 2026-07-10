'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bumpCandidate } from '@/lib/candidates/actions';
import { buildWhatsappBumpUrl } from '@/lib/candidates/bump';
import { formatDate } from '@/lib/format';

// "Recordatorio por WhatsApp" — opens WhatsApp (the user's own) with the bump
// message + the candidate's personalized upload link already typed in, then
// stamps last_bumped_at so the card shows who has been nudged. The actual send
// is manual: the user reviews and taps send in WhatsApp.
export function WhatsAppBumpButton({
  candidateId,
  firstName,
  phone,
  uploadToken,
  lastBumpedAt,
  size = 'md',
}: {
  candidateId: string;
  firstName: string;
  phone: string | null;
  uploadToken: string;
  lastBumpedAt: string | null;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const waUrl = buildWhatsappBumpUrl({ firstName, phone, uploadToken });
  const pad = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';

  const icon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02ZM12.04 20.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24a8.18 8.18 0 0 1 5.82 2.42 8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01a.92.92 0 0 0-.67.31c-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.02 2.59.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );

  if (!waUrl) {
    return (
      <span
        className={`inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-stone-100 font-medium text-stone-400 ${pad}`}
        title="Sin teléfono válido"
      >
        {icon} Recordatorio
      </span>
    );
  }

  function onClick() {
    // Open WhatsApp synchronously so it counts as a direct user gesture (avoids
    // popup blocking), then stamp the bump and refresh so the date updates.
    window.open(waUrl as string, '_blank', 'noopener');
    start(async () => {
      await bumpCandidate(candidateId);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={onClick}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white font-medium text-stone-700 shadow-card transition-colors hover:bg-stone-50 disabled:opacity-50 ${pad}`}
      >
        <span className="text-green-600">{icon}</span>
        {pending ? 'Abriendo…' : 'Recordatorio'}
      </button>
      {lastBumpedAt && (
        <span className="text-xs text-stone-400">Último: {formatDate(lastBumpedAt)}</span>
      )}
    </span>
  );
}
