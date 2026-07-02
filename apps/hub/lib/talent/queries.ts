// Talent-pool data access (Brief §5.3). Joins talent_pool → candidates so the
// view can filter by metro/state/active/onboarding (on talent_pool) and by
// bilingual/experience (on the candidate). This is the future dispatch board,
// so availability + active + location are surfaced as first-class fields.
// The talent pool is managed by all staff (any metro), so reads use the
// service-role client and are gated only by login (middleware). The pipeline
// queues stay metro-scoped via RLS; the talent pool is intentionally shared.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { getMetros } from '@/lib/location/metros-store';
import type { Availability } from '@cima/db';

export interface TalentCandidate {
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  bilingual: boolean | null;
  prior_experience: boolean | null;
  app_comfortable: boolean | null;
  score_total: number | null;
}

export interface TalentRow {
  id: string;
  candidate_id: string;
  created_at: string;
  metro_area: string | null;
  state: string | null;
  availability: Availability;
  active: boolean;
  onboarding_complete: boolean;
  candidates: TalentCandidate;
}

export interface TalentFilters {
  metro?: string;
  state?: string;
  active?: boolean; // undefined = all
  bilingual?: boolean;
  experience?: boolean;
  onboarding?: boolean;
}

const CANDIDATE_COLS =
  'first_name,last_name,email,phone,city,bilingual,prior_experience,app_comfortable,score_total';

export async function listTalentPool(filters: TalentFilters): Promise<TalentRow[]> {
  const supabase = createAdminClient();

  // talent_pool-level filters run in the query; inner join pulls the candidate.
  let query = supabase
    .from('talent_pool')
    .select(`id,candidate_id,created_at,metro_area,state,availability,active,onboarding_complete,candidates!inner(${CANDIDATE_COLS})`)
    .order('metro_area', { ascending: true, nullsFirst: false })
    .order('state', { ascending: true });

  if (filters.metro) query = query.eq('metro_area', filters.metro);
  if (filters.state) query = query.eq('state', filters.state);
  if (filters.active !== undefined) query = query.eq('active', filters.active);
  if (filters.onboarding !== undefined) query = query.eq('onboarding_complete', filters.onboarding);

  const { data, error } = await query;
  if (error) throw error;

  // Candidate-level boolean filters applied in-memory (small dataset, avoids
  // embedded-resource filter typing friction).
  let rows = (data ?? []) as unknown as TalentRow[];
  if (filters.bilingual !== undefined) {
    rows = rows.filter((r) => (r.candidates.bilingual ?? false) === filters.bilingual);
  }
  if (filters.experience !== undefined) {
    rows = rows.filter((r) => (r.candidates.prior_experience ?? false) === filters.experience);
  }
  return rows;
}

export interface TalentFacets {
  metros: string[];
  states: string[];
  total: number;
}

export interface MetroCount {
  metro: string;
  coords: [number, number];
  active: number;
  total: number;
}

/**
 * Per-metro headcount for the talent map. A dot is returned for any metro that
 * has at least one pool member AND a known location on the map. `total` drives
 * the dot size; `active` (active=true) is the dispatch-ready count shown in the
 * popup. Metros with no coordinates (or none in METROS) are skipped — they'd
 * have nowhere to plot — so the list view remains the source of truth for them.
 */
export async function metroCounts(): Promise<MetroCount[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('talent_pool').select('metro_area,active');
  if (error) throw error;

  const tally = new Map<string, { active: number; total: number }>();
  for (const r of data ?? []) {
    if (!r.metro_area) continue;
    const t = tally.get(r.metro_area) ?? { active: 0, total: 0 };
    t.total += 1;
    if (r.active) t.active += 1;
    tally.set(r.metro_area, t);
  }

  const metros = await getMetros();
  const out: MetroCount[] = [];
  for (const m of metros) {
    const t = tally.get(m.metro);
    if (!t) continue; // no one here → no dot
    out.push({ metro: m.metro, coords: m.coords, active: t.active, total: t.total });
  }
  return out;
}

/** Distinct metros/states for the filter dropdowns, plus the pool size. */
export async function talentFacets(): Promise<TalentFacets> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('talent_pool').select('metro_area,state');
  if (error) throw error;
  const metros = new Set<string>();
  const states = new Set<string>();
  for (const r of data ?? []) {
    if (r.metro_area) metros.add(r.metro_area);
    if (r.state) states.add(r.state);
  }
  return {
    metros: Array.from(metros).sort(),
    states: Array.from(states).sort(),
    total: data?.length ?? 0,
  };
}
