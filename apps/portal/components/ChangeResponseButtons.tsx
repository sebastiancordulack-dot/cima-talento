'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@cima/ui';
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
        <Button onClick={() => respond('approved')} loading={pending}>
          Approve change
        </Button>
        <Button variant="secondary" onClick={() => respond('rejected')} disabled={pending}>
          Decline
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
