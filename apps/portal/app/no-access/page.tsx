import Image from 'next/image';
import { SignOutButton } from '@/components/SignOutButton';

// Landing spot for authenticated sessions that are NOT active brand clients
// (e.g. a CiMA staff login used on the portal, or a deactivated client).
// Exempted in middleware so the requireBrandClient redirect can't loop.
export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="relative w-full max-w-sm">
        {/* Out of flow so only the card is centered; logo floats above it. */}
        <div className="absolute bottom-full left-0 right-0 mb-6 flex justify-center">
          <Image src="/cima-logo.png" alt="CiMA" width={148} height={48} />
        </div>
        <div className="rounded-2xl border border-stone-200/70 bg-white p-8 text-center shadow-card">
          <p className="text-lg font-semibold text-stone-900">No portal access</p>
          <p className="mt-2 text-sm text-stone-500">
            This account doesn&apos;t have Client Portal access. If you believe this is a mistake,
            contact your CiMA representative.
          </p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
