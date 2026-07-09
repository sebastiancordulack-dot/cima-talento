import { cx } from '../cx';

// Shared look for all text-like controls (spec §6): stone borders, brand focus.
// Width-free so callers can use flex-1/w-28 etc.; the Input/Textarea/Select
// components default to full width.
export function controlClasses(className?: string): string {
  return cx(
    'rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800',
    'placeholder:text-stone-400',
    'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
    'disabled:bg-stone-50 disabled:text-stone-400',
    className,
  );
}

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={controlClasses(cx('w-full', className))} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={controlClasses(cx('w-full', className))} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select className={controlClasses(cx('w-full', className))} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-stone-600">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
