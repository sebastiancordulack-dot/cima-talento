// DB-backed metro catalog. The metros table (migration 0003) is the runtime
// source of truth so staff can add metros from the UI. The static METROS array
// in metro-data.ts is kept only as the seed AND as a safety fallback: if the
// table is missing (migration not applied yet) or unreachable, the app keeps
// resolving locations against the built-in list.
//
// A short in-memory cache avoids hitting the DB on every ingestion/render; it's
// invalidated immediately after a metro is added (same instance) and otherwise
// expires within TTL across instances.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { METROS, normalizeText } from '@/lib/location/metro-data';

export interface MetroRecord {
  metro: string;
  state: string;
  coords: [number, number]; // [lng, lat]
  zip3: string[];
  cities: string[];
}

const FALLBACK: MetroRecord[] = METROS.map((m) => ({
  metro: m.metro,
  state: m.state,
  coords: m.coords,
  zip3: m.zip3,
  cities: m.cities,
}));

const TTL_MS = 60_000;
let cache: { at: number; rows: MetroRecord[] } | null = null;

export async function getMetros(): Promise<MetroRecord[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from('metros')
      .select('metro,state,lng,lat,zip3,cities')
      .order('metro');
    if (error || !data) throw error ?? new Error('no metros');
    const rows: MetroRecord[] = data.map((r) => ({
      metro: r.metro,
      state: r.state,
      coords: [r.lng, r.lat],
      zip3: r.zip3 ?? [],
      cities: r.cities ?? [],
    }));
    cache = { at: Date.now(), rows: rows.length ? rows : FALLBACK };
    return cache.rows;
  } catch {
    // Table not migrated yet (or transient error) → keep working on the seed.
    return FALLBACK;
  }
}

/** ZIP3 / city → metro lookup maps, built from the live catalog. */
export async function getMetroLookups(): Promise<{
  zip3: Record<string, { metro: string; state: string }>;
  city: Record<string, { metro: string; state: string }>;
}> {
  const rows = await getMetros();
  const zip3: Record<string, { metro: string; state: string }> = {};
  const city: Record<string, { metro: string; state: string }> = {};
  for (const m of rows) {
    for (const z of m.zip3) zip3[z] = { metro: m.metro, state: m.state };
    for (const c of m.cities) city[normalizeText(c)] = { metro: m.metro, state: m.state };
  }
  return { zip3, city };
}

export function invalidateMetrosCache(): void {
  cache = null;
}
