import { cx } from '../cx';

// One pill style for every status enum on all three surfaces (spec §4.1):
// soft tint background + strong text + optional meaning-dot.
export type BadgeTone =
  | 'gray'
  | 'brand'
  | 'green'
  | 'lime'
  | 'blue'
  | 'sky'
  | 'cyan'
  | 'teal'
  | 'indigo'
  | 'violet'
  | 'amber'
  | 'rose';

const TONES: Record<BadgeTone, string> = {
  gray: 'bg-stone-100 text-stone-600',
  brand: 'bg-brand-100 text-brand-800',
  green: 'bg-green-50 text-green-700',
  lime: 'bg-lime-50 text-lime-700',
  blue: 'bg-blue-50 text-blue-700',
  sky: 'bg-sky-50 text-sky-700',
  cyan: 'bg-cyan-50 text-cyan-700',
  teal: 'bg-teal-50 text-teal-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  violet: 'bg-violet-50 text-violet-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
};

export function Badge({
  tone = 'gray',
  dot = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
