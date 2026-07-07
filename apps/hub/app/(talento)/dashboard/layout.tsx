import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';
import { isAdminRole, requireUser } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = isAdminRole(user.hm?.role);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-gray-900">CiMA Talento</span>
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
              Pipeline
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/activaciones" className="text-sm font-medium text-green-700 hover:underline">
              Activaciones
            </Link>
            {isAdmin && (
              <Link href="/julia" className="text-sm font-medium text-violet-700 hover:underline">
                Vista de Julia
              </Link>
            )}
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
