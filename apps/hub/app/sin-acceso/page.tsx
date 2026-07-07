import { SignOutButton } from '@/components/SignOutButton';

// Landing spot for authenticated sessions that are NOT internal staff (e.g. a
// brand-client portal login used on the Hub). Outside the middleware's
// protected prefixes on purpose, so the requireUser redirect can't loop.
export default function SinAccesoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">Sin acceso a CiMA Hub</p>
        <p className="mt-2 text-sm text-gray-500">
          Esta cuenta no pertenece al equipo interno. Si eres cliente, entra por el Client Portal;
          si eres del equipo, pide acceso a un administrador.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
