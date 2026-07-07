'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveQuote } from '@/lib/actions';

// Approve the quote (Brief §13.4). For multi-location submissions this
// approves every location — one quote covers the whole batch (§6A).
export function ApproveQuoteButton({
  solicitudId,
  locationCount,
}: {
  solicitudId: string;
  locationCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    const confirmText =
      locationCount > 1
        ? `Approve this quote? It covers all ${locationCount} locations in your submission.`
        : 'Approve this quote? The CiMA team will confirm your activation.';
    if (!window.confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const res = await approveQuote(solicitudId);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Something went wrong.');
    });
  }

  return (
    <div className="mt-4">
      <button
        onClick={approve}
        disabled={pending}
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto"
      >
        {pending ? 'Approving…' : locationCount > 1 ? `Approve quote (${locationCount} locations)` : 'Approve quote'}
      </button>
      <p className="mt-1.5 text-xs text-gray-400">
        Questions about the quote? Contact your CiMA representative before approving.
      </p>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
