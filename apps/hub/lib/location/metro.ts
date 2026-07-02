// Location derivation — city/ZIP → metro area + state (Brief §9).
//
// Order of precedence:
//   1. ZIP 3-digit prefix  (most reliable)
//   2. city name           (normalized, accent-insensitive)
//   3. geocoding fallback  (optional; only if a provider key is configured)
// The state comes from the form when present (normalized to a 2-letter code),
// otherwise from whatever the metro match implies.
//
// A null metro_area is intentional and safe: such candidates are visible to all
// hiring managers (RLS), so nobody falls through the cracks before being mapped.
import { normalizeText, normalizeState } from '@/lib/location/metro-data';
import { getMetroLookups } from '@/lib/location/metros-store';
import { geocodeMetro } from '@/lib/location/geocode';

export interface DerivedLocation {
  metro_area: string | null;
  state: string | null;
}

export interface LocationInput {
  city?: string | null;
  zip_code?: string | null;
  state?: string | null;
}

export async function deriveLocation(input: LocationInput): Promise<DerivedLocation> {
  const state = normalizeState(input.state);
  const { zip3, city } = await getMetroLookups();

  // 1. ZIP prefix.
  const digits = (input.zip_code ?? '').replace(/\D/g, '');
  if (digits.length >= 3) {
    const hit = zip3[digits.slice(0, 3)];
    if (hit) return { metro_area: hit.metro, state: state ?? hit.state };
  }

  // 2. City name.
  if (input.city) {
    const hit = city[normalizeText(input.city)];
    if (hit) return { metro_area: hit.metro, state: state ?? hit.state };
  }

  // 3. Geocoding fallback (no-op unless configured).
  const geo = await geocodeMetro(input);
  if (geo) return { metro_area: geo.metro_area, state: state ?? geo.state };

  return { metro_area: null, state };
}
