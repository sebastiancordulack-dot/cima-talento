// Filter + sort logic for the "Nuevos interesados" tab. Pure and client/server
// safe (no 'server-only' import; the Candidate type comes from database.types,
// type-only). Filters combine with AND and are driven entirely by URL params so
// the view is shareable and consistent with the Talento-tab filters.
import type { Database } from '@cima/db';

type Candidate = Database['public']['Tables']['candidates']['Row'];

/** Bucket key for candidates with no metro assigned (matches the queue's
 *  group header so the chip value and the grouping line up). */
export const METRO_UNASSIGNED = 'Sin metro asignado';

export interface NuevosFilters {
  /** Selected metros; empty = all. Uses METRO_UNASSIGNED for null metro. */
  metros: string[];
  /** con = CV uploaded, sin = not uploaded, null = todos. */
  cv: 'con' | 'sin' | null;
  /** agendada = status 'scheduled', sin = status 'new', null = todas. */
  llamada: 'agendada' | 'sin' | null;
  /** Date received order. Default 'antiguos' (oldest first, the queue order). */
  sort: 'recientes' | 'antiguos';
}

export function parseNuevosFilters(sp: Record<string, string | undefined>): NuevosFilters {
  const metros = (sp.metros ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const cv = sp.cv === 'con' || sp.cv === 'sin' ? sp.cv : null;
  const llamada = sp.llamada === 'agendada' || sp.llamada === 'sin' ? sp.llamada : null;
  const sort = sp.sort === 'recientes' ? 'recientes' : 'antiguos';
  return { metros, cv, llamada, sort };
}

/** True when anything deviates from the default (all metros, todos, antiguos). */
export function isNuevosFilterActive(f: NuevosFilters): boolean {
  return f.metros.length > 0 || f.cv !== null || f.llamada !== null || f.sort !== 'antiguos';
}

function metroKey(c: Candidate): string {
  return c.metro_area ?? METRO_UNASSIGNED;
}

/** Apply the active filters and the chosen date sort. */
export function applyNuevosFilters(candidates: Candidate[], f: NuevosFilters): Candidate[] {
  const filtered = candidates.filter((c) => {
    if (f.metros.length > 0 && !f.metros.includes(metroKey(c))) return false;
    if (f.cv === 'con' && !c.resume_uploaded_at) return false;
    if (f.cv === 'sin' && c.resume_uploaded_at) return false;
    if (f.llamada === 'agendada' && c.status !== 'scheduled') return false;
    if (f.llamada === 'sin' && c.status !== 'new') return false;
    return true;
  });
  return filtered.sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return f.sort === 'recientes' ? tb - ta : ta - tb;
  });
}

/** Distinct metro buckets present in the tab (for the chip options), unassigned
 *  last — derived from the full unfiltered set so the chips stay stable. */
export function availableMetrosFrom(candidates: Candidate[]): string[] {
  const set = new Set(candidates.map(metroKey));
  return Array.from(set).sort((a, b) => {
    if (a === METRO_UNASSIGNED) return 1;
    if (b === METRO_UNASSIGNED) return -1;
    return a.localeCompare(b);
  });
}
