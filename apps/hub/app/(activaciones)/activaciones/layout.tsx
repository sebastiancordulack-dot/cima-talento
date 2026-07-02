import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';
import { requireUser } from '@/lib/auth/session';

export default async function ActivacionesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/activaciones" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-gray-900">CiMA Activaciones</span>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
              Módulo
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-blue-700 hover:underline">
              Talento
            </Link>
            {user && (
              <span className="hidden text-sm text-gray-500 sm:inline">
                {user.hm?.name ?? user.email}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
