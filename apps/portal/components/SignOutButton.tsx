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
      className="text-sm font-medium text-gray-500 hover:text-gray-800"
    >
      Sign out
    </button>
  );
}
