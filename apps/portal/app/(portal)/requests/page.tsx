import Link from 'next/link';
import { RequestCard } from '@/components/RequestCard';
import { listAllSolicitudes } from '@/lib/queries';
import { CLIENT_STATUS_META } from '@/lib/status';
import type { SolicitudStatus } from '@cima/db';

export const dynamic = 'force-dynamic';

// My Requests (Brief §13.3): full history, filterable by status.
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const filter =
    searchParams.status && searchParams.status in CLIENT_STATUS_META
      ? (searchParams.status as SolicitudStatus)
      : undefined;
  const solicitudes = await listAllSolicitudes(filter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
        <Link
          href="/requests/new"
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          + Submit New Request
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <FilterChip label="All" href="/requests" active={!filter} />
        {(Object.keys(CLIENT_STATUS_META) as SolicitudStatus[]).map((status) => (
          <FilterChip
            key={status}
            label={CLIENT_STATUS_META[status].label}
            href={`/requests?status=${status}`}
            active={filter === status}
          />
        ))}
      </div>

      {solicitudes.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            {filter ? 'No requests with this status.' : 'No requests yet — submit your first one!'}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {solicitudes.map((s) => (
            <RequestCard key={s.id} solicitud={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  );
}
