import { SignOutButton } from '@/components/SignOutButton';

// Landing spot for authenticated sessions that are NOT active brand clients
// (e.g. a CiMA staff login used on the portal, or a deactivated client).
// Exempted in middleware so the requireBrandClient redirect can't loop.
export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">No portal access</p>
        <p className="mt-2 text-sm text-gray-500">
          This account doesn&apos;t have Client Portal access. If you believe this is a mistake,
          contact your CiMA representative.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
