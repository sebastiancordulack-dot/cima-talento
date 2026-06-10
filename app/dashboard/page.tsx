import { CandidateCard } from '@/components/CandidateCard';
import { DashboardTabs } from '@/components/DashboardTabs';
import { listCandidatesForTab, tabCounts, type Candidate } from '@/lib/candidates/queries';
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
  searchParams: { tab?: string };
}) {
  const tab: DashboardTab = isDashboardTab(searchParams.tab) ? searchParams.tab : 'nuevos';
  const [candidates, counts] = await Promise.all([
    listCandidatesForTab(tab),
    tabCounts(),
  ]);
  const groups = groupByMetro(candidates);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{DASHBOARD_TABS[tab].label}</h1>
      <DashboardTabs active={tab} counts={counts} />

      {candidates.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-400">
          No hay candidatos en esta vista.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map(([metro, list]) => (
            <section key={metro}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {metro} · {list.length}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <CandidateCard key={c.id} candidate={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
