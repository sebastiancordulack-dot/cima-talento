import { cx } from '../cx';

// Class builders for link-based (GET param) tabs — apps render <Link> and
// keep their existing URL semantics; these only style them (spec §6).

export function pillTabClasses(active: boolean, className?: string): string {
  return cx(
    'inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors',
    active ? 'bg-brand-700 text-white' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800',
    className,
  );
}

// Count chip inside a pill tab (Noteflow pattern).
export function TabCount({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
        active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500',
      )}
    >
      {children}
    </span>
  );
}

// Segmented control (Salezy Monthly/Yearly → calendar día/semana/mes).
export function segmentedContainerClasses(className?: string): string {
  return cx('inline-flex items-center gap-1 rounded-xl bg-stone-100 p-1', className);
}

export function segmentedItemClasses(active: boolean, className?: string): string {
  return cx(
    'inline-flex h-7 items-center rounded-lg px-3 text-[13px] font-medium transition-colors',
    active ? 'bg-white text-stone-900 shadow-card' : 'text-stone-500 hover:text-stone-800',
    className,
  );
}
