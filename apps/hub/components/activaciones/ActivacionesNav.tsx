'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Module sections (Activaciones Brief §14). "Clientes" (portal account
// provisioning) is admin-only, so it's hidden for staff — the page itself is
// also gated with requireAdmin.
const SECTIONS = [
  { href: '/activaciones', label: 'Solicitudes' },
  { href: '/activaciones/eventos', label: 'Eventos Confirmados' },
  { href: '/activaciones/clientes', label: 'Clientes', adminOnly: true },
] as const;

export function ActivacionesNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/activaciones'
      ? pathname === '/activaciones' || pathname.startsWith('/activaciones/solicitudes')
      : pathname.startsWith(href);

  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200">
      {SECTIONS.filter((s) => !('adminOnly' in s && s.adminOnly) || isAdmin).map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            isActive(section.href)
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
