import Link from 'next/link';
import { DASHBOARD_TABS, TAB_ORDER, type DashboardTab } from '@/lib/candidates/status';

export function DashboardTabs({
  active,
  counts,
}: {
  active: DashboardTab;
  counts: Record<DashboardTab, number>;
}) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200">
      {TAB_ORDER.map((tab) => {
        const isActive = tab === active;
        return (
          <Link
            key={tab}
            href={`/dashboard?tab=${tab}`}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {DASHBOARD_TABS[tab].label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {counts[tab]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
