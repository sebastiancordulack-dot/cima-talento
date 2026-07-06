'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { respondToChange } from '@/lib/actions';

// Approve / Decline for a CiMA-proposed change (Brief §13.4). Approving moves
// the request to "Approved by you"; declining sends it back to the CiMA team.
export function ChangeResponseButtons({ changeId }: { changeId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(response: 'approved' | 'rejected') {
    const confirmText =
      response === 'approved'
        ? 'Approve this change? Your request will move forward with the new details.'
        : 'Decline this change? Our team will follow up with you.';
    if (!window.confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const res = await respondToChange(changeId, response);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Something went wrong.');
    });
  }

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <button
          onClick={() => respond('approved')}
          disabled={pending}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve change
        </button>
        <button
          onClick={() => respond('rejected')}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
