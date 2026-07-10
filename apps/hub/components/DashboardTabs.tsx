import Link from 'next/link';
import { StatCard } from '@cima/ui';
import { DASHBOARD_TABS, TAB_ORDER, type DashboardTab } from '@/lib/candidates/status';

// The four dashboard tabs as clickable KPI stat cards (spec §7.2) — same
// pattern as the Activaciones queue: the headline numbers ARE the filter
// controls. Switching tabs keeps the vista (lista/tarjetas), drops search.
const DOTS: Record<DashboardTab, string> = {
  nuevos: 'bg-blue-500',
  proceso: 'bg-amber-500',
  talento: 'bg-brand-500',
  archivo: 'bg-stone-400',
};

export function DashboardTabs({
  active,
  counts,
  vista,
}: {
  active: DashboardTab;
  counts: Record<DashboardTab, number>;
  vista?: 'lista' | 'tarjetas';
}) {
  const suffix = vista === 'tarjetas' ? '&vista=tarjetas' : '';
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TAB_ORDER.map((tab) => (
        <Link
          key={tab}
          href={`/dashboard?tab=${tab}${suffix}`}
          className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <StatCard
            label={DASHBOARD_TABS[tab].label}
            value={counts[tab]}
            dotClassName={DOTS[tab]}
            active={tab === active}
            interactive
          />
        </Link>
      ))}
    </div>
  );
}
