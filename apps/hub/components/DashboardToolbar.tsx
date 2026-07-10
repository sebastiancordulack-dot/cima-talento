import Link from 'next/link';
import { Search } from 'lucide-react';
import {
  Button,
  Input,
  buttonClasses,
  segmentedContainerClasses,
  segmentedItemClasses,
} from '@cima/ui';

type Vista = 'lista' | 'tarjetas';

// Search + view toggle for the candidate pipeline tabs (spec §7.2). Plain GET
// form — URL-driven like the rest of the Hub, so views are shareable. `carry`
// holds the Nuevos filter params so searching/toggling doesn't wipe them.
function qs(
  tab: string,
  vista: Vista,
  carry: Record<string, string | undefined>,
  q?: string,
): string {
  const p = new URLSearchParams();
  p.set('tab', tab);
  if (vista === 'tarjetas') p.set('vista', 'tarjetas');
  for (const [k, v] of Object.entries(carry)) if (v) p.set(k, v);
  if (q) p.set('q', q);
  return p.toString();
}

export function DashboardToolbar({
  tab,
  vista,
  q,
  carry,
}: {
  tab: string;
  vista: Vista;
  q?: string;
  carry: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form method="get" action="/dashboard" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value={tab} />
        {vista === 'tarjetas' && <input type="hidden" name="vista" value="tarjetas" />}
        {Object.entries(carry).map(([k, v]) =>
          v ? <input key={k} type="hidden" name={k} value={v} /> : null,
        )}
        <div className="relative w-56">
          <Search
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar candidato…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
        {q && (
          <Link href={`/dashboard?${qs(tab, vista, carry)}`} className={buttonClasses('ghost')}>
            Limpiar
          </Link>
        )}
      </form>

      <nav className={segmentedContainerClasses()}>
        {(['lista', 'tarjetas'] as const).map((v) => (
          <Link
            key={v}
            href={`/dashboard?${qs(tab, v, carry, q)}`}
            className={segmentedItemClasses(vista === v)}
          >
            {v === 'lista' ? 'Lista' : 'Tarjetas'}
          </Link>
        ))}
      </nav>
    </div>
  );
}
