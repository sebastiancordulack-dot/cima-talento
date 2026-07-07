import Link from 'next/link';
import { RequestCard } from '@/components/RequestCard';
import { requireBrandClient } from '@/lib/auth';
import { listActiveSolicitudes } from '@/lib/queries';
import { CLIENT_STATUS_META } from '@/lib/status';

export const dynamic = 'force-dynamic';

// Dashboard (Brief §13.1): action-needed requests first, then everything
// active, and a prominent "Submit New Request" CTA.
export default async function DashboardPage() {
  const client = await requireBrandClient();
  const active = await listActiveSolicitudes();
  const needsAction = active.filter((s) => CLIENT_STATUS_META[s.status].actionNeeded);
  const rest = active.filter((s) => !CLIENT_STATUS_META[s.status].actionNeeded);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {client.company_name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your brand activations with CiMA — all in one place.
          </p>
        </div>
        <Link
          href="/requests/new"
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          + Submit New Request
        </Link>
      </div>

      {needsAction.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-600">
            Waiting on you
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {needsAction.map((s) => (
              <RequestCard key={s.id} solicitud={s} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Active requests
        </h2>
        {rest.length === 0 && needsAction.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No active requests yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              Submit your first activation request and track it here from review to completion.
            </p>
            <Link
              href="/requests/new"
              className="mt-4 inline-block rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Submit New Request
            </Link>
          </div>
        ) : rest.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing else in flight.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((s) => (
              <RequestCard key={s.id} solicitud={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
