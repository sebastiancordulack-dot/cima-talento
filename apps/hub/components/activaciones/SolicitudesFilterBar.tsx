import Link from 'next/link';

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
      <input
        type="search"
        name="q"
        defaultValue={q ?? ''}
        placeholder="Buscar marca, tienda o evento…"
        className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
      <select
        name="cliente"
        defaultValue={clientId ?? ''}
        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 focus:border-green-500 focus:outline-none"
      >
        <option value="">Todos los clientes</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.company_name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Filtrar
      </button>
      {active && (
        <Link href={`/activaciones?tab=${tab}`} className="text-sm text-gray-400 hover:text-gray-600">
          Limpiar
        </Link>
      )}
    </form>
  );
}
