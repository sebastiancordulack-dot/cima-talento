import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button, Input, Select, buttonClasses } from '@cima/ui';

// Search + client filter for the queue (plain GET form — URL-driven, no JS).
// Search spans every status so a request is findable no matter which tab its
// lifecycle moved it to.
export function SolicitudesFilterBar({
  tab,
  q,
  clientId,
  clients,
}: {
  tab: string;
  q?: string;
  clientId?: string;
  clients: { id: string; company_name: string }[];
}) {
  const active = Boolean(q || clientId);
  return (
    <form method="get" action="/activaciones" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="tab" value={tab} />
      <div className="relative w-64">
        <Search
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
        />
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar marca, tienda o evento…"
          className="pl-9"
        />
      </div>
      <div className="w-52">
        <Select name="cliente" defaultValue={clientId ?? ''}>
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary">
        Filtrar
      </Button>
      {active && (
        <Link href={`/activaciones?tab=${tab}`} className={buttonClasses('ghost')}>
          Limpiar
        </Link>
      )}
    </form>
  );
}
