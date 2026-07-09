import Image from 'next/image';
import { SignOutButton } from '@/components/SignOutButton';

// Landing spot for authenticated sessions that are NOT internal staff (e.g. a
// brand-client portal login used on the Hub). Outside the middleware's
// protected prefixes on purpose, so the requireUser redirect can't loop.
export default function SinAccesoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="relative w-full max-w-sm">
        {/* Out of flow so only the card is centered; logo floats above it. */}
        <div className="absolute bottom-full left-0 right-0 mb-6 flex justify-center">
          <Image src="/cima-logo.png" alt="CiMA" width={148} height={48} />
        </div>
        <div className="rounded-2xl border border-stone-200/70 bg-white p-8 text-center shadow-card">
          <p className="text-lg font-semibold text-stone-900">Sin acceso a CiMA Hub</p>
          <p className="mt-2 text-sm text-stone-500">
            Esta cuenta no pertenece al equipo interno. Si eres cliente, entra por el Client Portal;
            si eres del equipo, pide acceso a un administrador.
          </p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
