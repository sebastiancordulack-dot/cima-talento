import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses } from '@cima/ui';

// Branded 404 (spec §9 Phase 6) — floating-logo card, same pattern as login.
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="relative w-full max-w-sm">
        <div className="absolute bottom-full left-0 right-0 mb-6 flex justify-center">
          <Image src="/cima-logo.png" alt="CiMA" width={110} height={36} />
        </div>
        <div className="rounded-2xl border border-stone-200/70 bg-white p-8 text-center shadow-card">
          <p className="text-sm font-semibold tracking-wider text-stone-400">404</p>
          <h1 className="mt-1 text-lg font-semibold text-stone-900">Página no encontrada</h1>
          <p className="mt-2 text-sm text-stone-500">
            La página que buscas no existe o fue movida.
          </p>
          <Link href="/dashboard" className={buttonClasses('primary', 'md', 'mt-6')}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
