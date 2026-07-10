import { cx } from '../cx';

// One pill style for every status enum on all three surfaces (spec §4.1).
// Palette v2: *-100 tint + *-800 text + crisp inset ring — the *-50 tints
// washed out against white cards.
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
  gray: 'bg-stone-100 text-stone-700 ring-stone-500/20',
  brand: 'bg-brand-100 text-brand-900 ring-brand-600/25',
  green: 'bg-green-100 text-green-800 ring-green-600/20',
  lime: 'bg-lime-100 text-lime-800 ring-lime-600/20',
  blue: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  sky: 'bg-sky-100 text-sky-800 ring-sky-600/20',
  cyan: 'bg-cyan-100 text-cyan-800 ring-cyan-600/20',
  teal: 'bg-teal-100 text-teal-800 ring-teal-600/20',
  indigo: 'bg-indigo-100 text-indigo-800 ring-indigo-600/20',
  violet: 'bg-violet-100 text-violet-800 ring-violet-600/20',
  amber: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  rose: 'bg-rose-100 text-rose-800 ring-rose-600/20',
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
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
