'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@cima/db/client';

export function SignOutButton({
  className,
  title,
  children,
}: {
  className?: string;
  title?: string;
  children?: React.ReactNode;
}) {
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
      title={title}
      className={className ?? 'text-sm text-stone-400 hover:text-stone-600 disabled:opacity-50'}
    >
      {children ?? 'Cerrar sesión'}
    </button>
  );
}
