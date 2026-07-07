import Link from 'next/link';
import { QUEUE_TABS, QUEUE_TAB_ORDER, type QueueTab } from '@/modules/activaciones/status';

export function SolicitudesTabs({
  active,
  counts,
  clientId,
}: {
  active: QueueTab;
  counts: Record<QueueTab, number>;
  /** Preserved across tab switches; search (q) is intentionally dropped. */
  clientId?: string;
}) {
  const suffix = clientId ? `&cliente=${clientId}` : '';
  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200">
      {QUEUE_TAB_ORDER.map((tab) => {
        const isActive = tab === active;
        return (
          <Link
            key={tab}
            href={`/activaciones?tab=${tab}${suffix}`}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {QUEUE_TABS[tab].label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
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
