import Link from 'next/link';
import { TalentFilters } from '@/components/talent/TalentFilters';
import { ActiveToggle, OnboardingToggle } from '@/components/talent/TalentRowToggles';
import { AddTalentButton } from '@/components/talent/AddTalentButton';
import { RemoveTalentButton } from '@/components/talent/RemoveTalentButton';
import { TalentMap } from '@/components/talent/TalentMap';
import { listTalentPool, talentFacets, metroCounts, type TalentRow, type TalentFilters as Filters } from '@/lib/talent/queries';
import { formatAvailability, fullName } from '@/lib/format';

// Parse the URL search params into a typed filter set.
function parseFilters(sp: Record<string, string | undefined>): Filters {
  const bool = (v: string | undefined) => (v === 'true' ? true : v === 'false' ? false : undefined);
  return {
    metro: sp.metro || undefined,
    state: sp.state || undefined,
    active: bool(sp.active),
    onboarding: bool(sp.onboarding),
    bilingual: sp.bilingual === 'true' ? true : undefined,
    experience: sp.experience === 'true' ? true : undefined,
  };
}

function Yes({ value }: { value: boolean | null }) {
  return value ? <span className="text-green-700">Sí</span> : <span className="text-gray-300">—</span>;
}

// Group rows by metro for the org-by-metro layout (Brief §5.3).
function groupByMetro(rows: TalentRow[]): [string, TalentRow[]][] {
  const groups = new Map<string, TalentRow[]>();
  for (const r of rows) {
    const key = r.metro_area ?? 'Sin metro asignado';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return Array.from(groups.entries()).sort(([a], [b]) =>
    a === 'Sin metro asignado' ? 1 : b === 'Sin metro asignado' ? -1 : a.localeCompare(b)
  );
}

export async function TalentPoolSection({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const [rows, facets, mapMetros] = await Promise.all([
    listTalentPool(filters),
    talentFacets(),
    metroCounts(),
  ]);
  const groups = groupByMetro(rows);

  return (
    <div className="mt-6 space-y-4">
      <TalentMap metros={mapMetros} activeMetro={filters.metro} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rows.length} de {facets.total} en la Red de Talento
        </p>
        <AddTalentButton />
      </div>

      <TalentFilters metros={facets.metros} states={facets.states} />

      {rows.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-400">
          Ningún miembro coincide con estos filtros.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map(([metro, list]) => (
            <section key={metro}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {metro} · {list.length}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-2 font-medium">Nombre</th>
                      <th className="px-4 py-2 font-medium">Estado</th>
                      <th className="px-4 py-2 font-medium">Contacto</th>
                      <th className="px-4 py-2 font-medium">Disponibilidad</th>
                      <th className="px-4 py-2 text-center font-medium">Bilingüe</th>
                      <th className="px-4 py-2 text-center font-medium">Exp.</th>
                      <th className="px-4 py-2 font-medium">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {list.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/dashboard/candidates/${r.candidate_id}`}
                            className="font-medium text-gray-900 hover:text-blue-700 hover:underline"
                          >
                            {fullName(r.candidates.first_name, r.candidates.last_name)}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{r.state ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          <div>{r.candidates.email}</div>
                          <div className="text-xs text-gray-400">{r.candidates.phone ?? '—'}</div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{formatAvailability(r.availability)}</td>
                        <td className="px-4 py-2.5 text-center"><Yes value={r.candidates.bilingual} /></td>
                        <td className="px-4 py-2.5 text-center"><Yes value={r.candidates.prior_experience} /></td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            <ActiveToggle talentId={r.id} active={r.active} />
                            <OnboardingToggle talentId={r.id} complete={r.onboarding_complete} />
                            <RemoveTalentButton talentId={r.id} name={fullName(r.candidates.first_name, r.candidates.last_name)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
