import Link from 'next/link';
import { PageHeader, StatCard, buttonClasses } from '@cima/ui';
import { RequestCard } from '@/components/RequestCard';
import { requireBrandClient } from '@/lib/auth';
import { listActiveSolicitudes } from '@/lib/queries';
import { CLIENT_STATUS_META } from '@/lib/status';
import { formatPlainDate, parseDateRange } from '@cima/activaciones/dates';

export const dynamic = 'force-dynamic';

// Dashboard (Brief §13.1, spec §7.3): three headline numbers computed from the
// already-fetched active list, action-needed requests first, then everything
// active, and a prominent "Submit New Request" CTA.
export default async function DashboardPage() {
  const client = await requireBrandClient();
  const active = await listActiveSolicitudes();
  const needsAction = active.filter((s) => CLIENT_STATUS_META[s.status].actionNeeded);
  const rest = active.filter((s) => !CLIENT_STATUS_META[s.status].actionNeeded);

  // Locked-in activations; the hint surfaces the nearest upcoming date.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = active.filter((s) => s.status === 'confirmed' || s.status === 'in_progress');
  const nextDate = upcoming
    .map((s) => s.date ?? parseDateRange(s.event_dates)?.start)
    .filter((d): d is string => !!d && d >= today)
    .sort()[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${client.company_name}`}
        description="Your brand activations with CiMA — all in one place."
        actions={
          <Link href="/requests/new" className={buttonClasses('primary')}>
            + Submit New Request
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active requests" value={active.length} dotClassName="bg-brand-500" />
        <StatCard
          label="Waiting on you"
          value={needsAction.length}
          dotClassName="bg-violet-500"
          hint={
            needsAction.length > 0 ? 'Review below to keep things moving' : "You're all caught up"
          }
        />
        <StatCard
          label="Confirmed & upcoming"
          value={upcoming.length}
          dotClassName="bg-green-500"
          hint={nextDate ? `Next: ${formatPlainDate(nextDate)}` : undefined}
        />
      </div>

      {needsAction.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-violet-600">
            Waiting on you
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {needsAction.map((s) => (
              <RequestCard key={s.id} solicitud={s} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-stone-400">
          Active requests
        </h2>
        {rest.length === 0 && needsAction.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-stone-900">No active requests yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
              Submit your first activation request and track it here from review to completion.
            </p>
            <Link
              href="/requests/new"
              className={buttonClasses('primary', 'md', 'mt-4 inline-flex')}
            >
              Submit New Request
            </Link>
          </div>
        ) : rest.length === 0 ? (
          <p className="text-sm text-stone-400">Nothing else in flight.</p>
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
