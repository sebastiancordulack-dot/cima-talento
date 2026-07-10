import { Users } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '@cima/ui';
import { CandidateCard } from '@/components/CandidateCard';
import { CandidatesTable } from '@/components/CandidatesTable';
import { DashboardTabs } from '@/components/DashboardTabs';
import { DashboardToolbar } from '@/components/DashboardToolbar';
import { NuevosFilterBar } from '@/components/NuevosFilterBar';
import { TalentPoolSection } from '@/components/talent/TalentPoolSection';
import { listCandidatesForTab, tabCounts, type Candidate } from '@/lib/candidates/queries';
import { getMetros } from '@/lib/location/metros-store';
import { fullName } from '@/lib/format';
import {
  applyNuevosFilters,
  availableMetrosFrom,
  isNuevosFilterActive,
  parseNuevosFilters,
} from '@/lib/candidates/nuevos-filters';
import { DASHBOARD_TABS, isDashboardTab, type DashboardTab } from '@/lib/candidates/status';

export const dynamic = 'force-dynamic';

type Vista = 'lista' | 'tarjetas';

// Group candidates by metro for the card view (Brief §5.1). Null metros land
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

// View-layer search over the already-fetched list (spec §7.2) — name, email,
// phone, or metro. No query/lib changes.
function searchCandidates(list: Candidate[], q: string): Candidate[] {
  const needle = q.toLowerCase();
  return list.filter(
    (c) =>
      fullName(c.first_name, c.last_name).toLowerCase().includes(needle) ||
      c.email.toLowerCase().includes(needle) ||
      (c.phone ?? '').toLowerCase().includes(needle) ||
      (c.metro_area ?? '').toLowerCase().includes(needle),
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string } & Record<string, string | undefined>;
}) {
  const tab: DashboardTab = isDashboardTab(searchParams.tab) ? searchParams.tab : 'nuevos';
  const vista: Vista = searchParams.vista === 'tarjetas' ? 'tarjetas' : 'lista';
  const q = searchParams.q?.trim() || undefined;
  const counts = await tabCounts();

  // Nuevos filter params ride along through search + view toggling.
  const carry: Record<string, string | undefined> =
    tab === 'nuevos'
      ? {
          metros: searchParams.metros,
          cv: searchParams.cv,
          llamada: searchParams.llamada,
          sort: searchParams.sort,
        }
      : {};

  return (
    <div className="space-y-5">
      <PageHeader
        title="Talento"
        description="Pipeline de candidatos y Red de Talento de CiMA"
        actions={
          tab !== 'talento' ? (
            <DashboardToolbar tab={tab} vista={vista} q={q} carry={carry} />
          ) : undefined
        }
      />

      <DashboardTabs active={tab} counts={counts} vista={vista} />

      {/* Red de talento — the filterable dispatch board (Brief §5.3). */}
      {tab === 'talento' ? (
        <TalentPoolSection searchParams={searchParams} />
      ) : tab === 'nuevos' ? (
        <NuevosQueue searchParams={searchParams} vista={vista} q={q} />
      ) : (
        <CandidateQueue tab={tab} vista={vista} q={q} />
      )}
    </div>
  );
}

/** Nuevos interesados — metro / CV / llamada filters + date sort (URL-driven),
 *  now with search and the lista/tarjetas toggle applied on top. */
async function NuevosQueue({
  searchParams,
  vista,
  q,
}: {
  searchParams: Record<string, string | undefined>;
  vista: Vista;
  q?: string;
}) {
  const [candidates, metroRecords] = await Promise.all([
    listCandidatesForTab('nuevos'),
    getMetros(),
  ]);
  const metros = metroRecords.map((m) => m.metro).sort();

  const filters = parseNuevosFilters(searchParams);
  const availableMetros = availableMetrosFrom(candidates);
  let filtered = applyNuevosFilters(candidates, filters);
  if (q) filtered = searchCandidates(filtered, q);

  return (
    <div className="space-y-5">
      <NuevosFilterBar
        availableMetros={availableMetros}
        filters={filters}
        active={isNuevosFilterActive(filters)}
      />
      <Results tab="nuevos" vista={vista} q={q} candidates={filtered} metros={metros} />
    </div>
  );
}

async function CandidateQueue({ tab, vista, q }: { tab: DashboardTab; vista: Vista; q?: string }) {
  const [candidates, metroRecords] = await Promise.all([listCandidatesForTab(tab), getMetros()]);
  const metros = metroRecords.map((m) => m.metro).sort();
  const list = q ? searchCandidates(candidates, q) : candidates;

  return <Results tab={tab} vista={vista} q={q} candidates={list} metros={metros} />;
}

// Lista → one flat lean table in a card (Activaciones pattern).
// Tarjetas → the metro-grouped card grid (the original browse view).
function Results({
  tab,
  vista,
  q,
  candidates,
  metros,
}: {
  tab: DashboardTab;
  vista: Vista;
  q?: string;
  candidates: Candidate[];
  metros: string[];
}) {
  const empty = candidates.length === 0;
  const emptyState = (
    <EmptyState
      icon={<Users className="size-5" strokeWidth={1.75} />}
      title={q ? `Sin resultados para “${q}”` : `Nada en “${DASHBOARD_TABS[tab].label}”`}
      description={
        q
          ? 'Busca por nombre, correo, teléfono o metro — o revisa la ortografía.'
          : 'Cuando haya candidatos en esta etapa, aparecerán aquí.'
      }
    />
  );

  if (vista === 'tarjetas') {
    if (empty) return <Card padded={false}>{emptyState}</Card>;
    return (
      <div className="space-y-8">
        {groupByMetro(candidates).map(([metro, list]) => (
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

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-stone-900">
          {q ? <>Resultados para “{q}”</> : DASHBOARD_TABS[tab].label}
          <span className="ml-1.5 font-normal tabular-nums text-stone-400">
            ({candidates.length})
          </span>
        </h2>
      </div>
      {empty ? emptyState : <CandidatesTable candidates={candidates} />}
    </Card>
  );
}
