import Link from 'next/link';
import { StatCard, TabCount, pillTabClasses } from '@cima/ui';
import { QUEUE_TABS, type QueueTab } from '@/modules/activaciones/status';

// The four working tabs as clickable KPI stat cards (spec §7.1) — the
// headline numbers ARE the filter controls. Historial rides separately as a
// quiet pill (HistorialTab) so closed work doesn't compete for attention.
const CARD_TABS: { tab: QueueTab; dot: string }[] = [
  { tab: 'nuevas', dot: 'bg-blue-500' },
  { tab: 'revision', dot: 'bg-amber-500' },
  { tab: 'cliente', dot: 'bg-violet-500' },
  { tab: 'confirmadas', dot: 'bg-green-500' },
];

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
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARD_TABS.map(({ tab, dot }) => (
        <Link
          key={tab}
          href={`/activaciones?tab=${tab}${suffix}`}
          className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <StatCard
            label={QUEUE_TABS[tab].label}
            value={counts[tab]}
            dotClassName={dot}
            active={tab === active}
            interactive
          />
        </Link>
      ))}
    </div>
  );
}

export function HistorialTab({
  active,
  count,
  clientId,
}: {
  active: boolean;
  count: number;
  clientId?: string;
}) {
  const suffix = clientId ? `&cliente=${clientId}` : '';
  return (
    <Link href={`/activaciones?tab=historial${suffix}`} className={pillTabClasses(active)}>
      Historial
      <TabCount active={active}>{count}</TabCount>
    </Link>
  );
}
