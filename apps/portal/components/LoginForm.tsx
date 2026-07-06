'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@cima/db/client';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(
    params.get('error') === 'noclient'
      ? 'This account has no portal access. Contact your CiMA representative.'
      : null
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const { error: authError } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError('Invalid email or password.');
        return;
      }
      router.replace('/');
      router.refresh();
    });
  }

  const input =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          className={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          className={input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-center text-xs text-gray-400">
        Access is by invitation. Contact your CiMA representative if you need help signing in.
      </p>
    </form>
  );
}
