import { cx } from '../cx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-stone-200/60', className)} />;
}
