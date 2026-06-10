'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await createClient().auth.signOut();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <button
      onClick={signOut}
      disabled={pending}
      className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-50"
    >
      Cerrar sesión
    </button>
  );
}
