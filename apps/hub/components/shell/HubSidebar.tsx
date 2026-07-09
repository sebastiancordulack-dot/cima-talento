'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  Inbox,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react';
import { Avatar, cx } from '@cima/ui';
import { SignOutButton } from '@/components/SignOutButton';

// Hub navigation (spec §5.1): one white rail for both modules, replacing the
// three per-section headers. "Clientes" and "Vista de Julia" stay admin-only —
// same gating the old headers/ActivacionesNav enforced (pages are also
// guarded server-side).
const NAV = [
  {
    group: 'Activaciones',
    items: [
      { href: '/activaciones', label: 'Solicitudes', icon: Inbox },
      { href: '/activaciones/eventos', label: 'Eventos', icon: CalendarDays },
      { href: '/activaciones/clientes', label: 'Clientes', icon: Building2, adminOnly: true },
    ],
  },
  {
    group: 'Talento',
    items: [
      { href: '/dashboard', label: 'Pipeline', icon: Users },
      { href: '/julia', label: 'Vista de Julia', icon: ClipboardCheck, adminOnly: true },
    ],
  },
] as const;

function isActive(pathname: string, href: string): boolean {
  // Solicitudes owns the queue root and the detail workspace, but not the
  // sibling sections that also live under /activaciones.
  if (href === '/activaciones') {
    return pathname === '/activaciones' || pathname.startsWith('/activaciones/solicitudes');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Rail({
  name,
  email,
  isAdmin,
  pathname,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
  pathname: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <Link href="/dashboard" className="inline-flex">
          <Image src="/cima-logo.png" alt="CiMA" width={111} height={36} priority />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
        {NAV.map((group) => {
          const items = group.items.filter((item) => !('adminOnly' in item && item.adminOnly) || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={group.group}>
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                {group.group}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cx(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-brand-50 text-brand-800'
                            : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900',
                        )}
                      >
                        <item.icon
                          strokeWidth={1.75}
                          className={cx(
                            'size-[18px] shrink-0',
                            active ? 'text-brand-700' : 'text-stone-400',
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-stone-100 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-800">{name}</p>
            <p className="truncate text-xs text-stone-400">{email}</p>
          </div>
          <SignOutButton
            title="Cerrar sesión"
            className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
          >
            <LogOut className="size-4" strokeWidth={1.75} />
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}

export function HubSidebar({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer when navigation happens.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-stone-200/70 bg-white lg:block">
        <Rail name={name} email={email} isAdmin={isAdmin} pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200/70 bg-white px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="inline-flex">
          <Image src="/cima-logo.png" alt="CiMA" width={92} height={30} />
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-stone-950/25"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-card-hover">
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-5 rounded-lg p-2 text-stone-400 hover:bg-stone-100"
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
            <Rail name={name} email={email} isAdmin={isAdmin} pathname={pathname} />
          </div>
        </div>
      )}
    </>
  );
}
