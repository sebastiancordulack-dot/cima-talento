'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
        className="mt-2 text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
      >
        Have questions or need changes?
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg bg-gray-50 p-3">
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
        Your question or requested change
      </label>
      <textarea
        rows={3}
        autoFocus
        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        placeholder="e.g. Can we reduce the content-creation line item? We only need photos."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={pending || message.trim().length === 0}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? 'Sending…' : 'Send to CiMA'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </div>
  );
}
