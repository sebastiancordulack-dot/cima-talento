import { CandidateCard } from '@/components/CandidateCard';
import { DashboardTabs } from '@/components/DashboardTabs';
import { NuevosFilterBar } from '@/components/NuevosFilterBar';
import { TalentPoolSection } from '@/components/talent/TalentPoolSection';
import { listCandidatesForTab, tabCounts, type Candidate } from '@/lib/candidates/queries';
import { getMetros } from '@/lib/location/metros-store';
import {
  applyNuevosFilters,
  availableMetrosFrom,
  isNuevosFilterActive,
  parseNuevosFilters,
} from '@/lib/candidates/nuevos-filters';
import { DASHBOARD_TABS, isDashboardTab, type DashboardTab } from '@/lib/candidates/status';

export const dynamic = 'force-dynamic';

// Group candidates by metro for the queue view (Brief §5.1). Null metros land
// in an "unassigned" bucket shown last so nothing is hidden.
function groupByMetro(candidates: Candidate[]): [string, Candidate[]][] {
  const groups = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const key = c.metro_area ?? 'Sin metro asignado';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === 'Sin metro asignado') return 1;
    if (b === 'Sin metro asignado') return -1;
    return a.localeCompare(b);
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string } & Record<string, string | undefined>;
}) {
  const tab: DashboardTab = isDashboardTab(searchParams.tab) ? searchParams.tab : 'nuevos';
  const counts = await tabCounts();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-stone-900">
        {DASHBOARD_TABS[tab].label}
      </h1>
      <DashboardTabs active={tab} counts={counts} />

      {/* Red de talento — the filterable dispatch board (Brief §5.3). */}
      {tab === 'talento' ? (
        <TalentPoolSection searchParams={searchParams} />
      ) : tab === 'nuevos' ? (
        <NuevosQueue searchParams={searchParams} />
      ) : (
        <CandidateQueue tab={tab} />
      )}
    </div>
  );
}

/** Nuevos interesados — the metro-grouped queue with metro / CV / llamada
 *  filters and a date sort (all URL-driven). */
async function NuevosQueue({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const [candidates, metroRecords] = await Promise.all([
    listCandidatesForTab('nuevos'),
    getMetros(),
  ]);
  const metros = metroRecords.map((m) => m.metro).sort();

  if (candidates.length === 0) {
    return <p className="mt-10 text-center text-sm text-stone-400">No hay candidatos en esta vista.</p>;
  }

  const filters = parseNuevosFilters(searchParams);
  const availableMetros = availableMetrosFrom(candidates);
  const filtered = applyNuevosFilters(candidates, filters);
  const groups = groupByMetro(filtered);

  return (
    <div className="mt-6 space-y-6">
      <NuevosFilterBar
        availableMetros={availableMetros}
        filters={filters}
        active={isNuevosFilterActive(filters)}
      />

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-stone-400">
          Ningún candidato coincide con los filtros.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map(([metro, list]) => (
            <section key={metro}>
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                {metro} · {list.length}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <CandidateCard key={c.id} candidate={c} metros={metros} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

async function CandidateQueue({ tab }: { tab: DashboardTab }) {
  const [candidates, metroRecords] = await Promise.all([listCandidatesForTab(tab), getMetros()]);
  const groups = groupByMetro(candidates);
  const metros = metroRecords.map((m) => m.metro).sort();

  if (candidates.length === 0) {
    return <p className="mt-10 text-center text-sm text-stone-400">No hay candidatos en esta vista.</p>;
  }

  return (
    <div className="mt-6 space-y-8">
      {groups.map(([metro, list]) => (
        <section key={metro}>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-stone-400">
            {metro} · {list.length}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <CandidateCard key={c.id} candidate={c} metros={metros} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
