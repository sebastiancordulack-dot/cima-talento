import { cx } from '../cx';

export function Card({
  padded = true,
  interactive = false,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { padded?: boolean; interactive?: boolean }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-stone-200/70 bg-white shadow-card',
        padded && 'p-5',
        interactive && 'transition-shadow hover:shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('mb-4 flex items-start justify-between gap-3', className)}>
      <div>
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-stone-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
