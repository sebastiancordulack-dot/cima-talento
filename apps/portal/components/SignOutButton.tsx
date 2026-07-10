'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@cima/db/client';

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="text-sm font-medium text-stone-500 hover:text-stone-800"
    >
      Sign out
    </button>
  );
}
