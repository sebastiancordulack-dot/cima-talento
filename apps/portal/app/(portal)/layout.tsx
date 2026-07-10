import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses } from '@cima/ui';
import { SignOutButton } from '@/components/SignOutButton';
import { requireBrandClient } from '@/lib/auth';

// Authed portal shell (Brief §13, spec §5.2): polished white top bar — logo +
// Client Portal chip, nav, ink New Request CTA — on the shared canvas. Every
// page inside requires an active brand client.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const client = await requireBrandClient();

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200/70 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/cima-logo.png" alt="CiMA" width={92} height={30} priority />
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              Client Portal
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">
              Dashboard
            </Link>
            <Link
              href="/requests"
              className="text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              My Requests
            </Link>
            <Link href="/requests/new" className={buttonClasses('primary', 'sm')}>
              + New Request
            </Link>
            <span className="hidden text-sm text-stone-400 sm:inline">{client.company_name}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
