import { cx } from '../cx';

// Headline-number card (spec §6): label + big tabular number + optional hint.
// `active` marks it as the selected filter when stat cards double as tabs;
// wrap in <Link> at the call site for navigation.
export function StatCard({
  label,
  value,
  hint,
  icon,
  dotClassName,
  active = false,
  interactive = false,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Tailwind bg-* class for the small meaning-dot next to the label. */
  dotClassName?: string;
  active?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'rounded-2xl border bg-white p-5 shadow-card',
        active
          ? 'border-brand-300 ring-2 ring-brand-500/40'
          : 'border-stone-200/70',
        interactive && 'transition-shadow hover:shadow-card-hover',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-medium text-stone-500">
          {dotClassName && <span className={cx('size-2 rounded-full', dotClassName)} />}
          {label}
        </span>
        {icon && <span className="text-stone-400">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
