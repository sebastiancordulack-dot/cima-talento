import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';
import { requireBrandClient } from '@/lib/auth';

// Authed portal shell (Brief §13): every page inside requires an active brand
// client. Polished and brand-appropriate — this is what a CPG marketing
// manager sees when they log in (§15).
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const client = await requireBrandClient();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-gray-900">CiMA</span>
            <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
              Client Portal
            </span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/requests" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              My Requests
            </Link>
            <span className="hidden text-sm text-gray-400 sm:inline">{client.company_name}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
