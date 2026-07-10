'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Textarea } from '@cima/ui';
import { questionQuote } from '@/lib/actions';

// "Have questions or need changes?" — the in-platform alternative to replying
// to the quote email. Sends the request back to the CiMA team with the
// client's message attached.
export function QuoteQuestionForm({ solicitudId }: { solicitudId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!window.confirm('Send your question to the CiMA team? The quote will go back to review while we follow up.')) {
      return;
    }
    setError(null);
    start(async () => {
      const res = await questionQuote(solicitudId, message);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Something went wrong.');
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-sm font-medium text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
      >
        Have questions or need changes?
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-stone-50 p-3">
      <label className="mb-1 block text-xs font-medium text-stone-600">
        Your question or requested change
      </label>
      <Textarea
        rows={3}
        autoFocus
        placeholder="e.g. Can we reduce the content-creation line item? We only need photos."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button onClick={submit} disabled={message.trim().length === 0} loading={pending}>
          {pending ? 'Sending…' : 'Send to CiMA'}
        </Button>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          Cancel
        </button>
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </div>
  );
}
