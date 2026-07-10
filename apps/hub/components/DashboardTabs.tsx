import Link from 'next/link';
import { TabCount, pillTabClasses } from '@cima/ui';
import { DASHBOARD_TABS, TAB_ORDER, type DashboardTab } from '@/lib/candidates/status';

export function DashboardTabs({
  active,
  counts,
}: {
  active: DashboardTab;
  counts: Record<DashboardTab, number>;
}) {
  return (
    <nav className="flex flex-wrap gap-1.5">
      {TAB_ORDER.map((tab) => {
        const isActive = tab === active;
        return (
          <Link key={tab} href={`/dashboard?tab=${tab}`} className={pillTabClasses(isActive)}>
            {DASHBOARD_TABS[tab].label}
            <TabCount active={isActive}>{counts[tab]}</TabCount>
          </Link>
        );
      })}
    </nav>
  );
}
