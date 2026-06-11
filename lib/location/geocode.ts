// Geocoding fallback for cities not in the static table (Brief §9).
//
// Disabled unless GEOCODING_API_KEY is set, so the platform works out of the
// box on the static lookup alone. When enabled, it geocodes the address to
// recover a clean city + ZIP, then re-uses the static tables to resolve a
// canonical metro — so geocoding only normalizes the input; it never invents a
// metro name outside our controlled set.
//
// Currently wired for Google Geocoding; swap the URL/parser for Radar etc. by
// editing `callProvider`. Always fails soft (returns null) so a geocoder
// outage never blocks candidate ingestion.
import { ZIP3_TO_METRO, CITY_TO_METRO, normalizeText } from '@/lib/location/metro-data';
import type { LocationInput } from '@/lib/location/metro';

export interface GeocodeResult {
  metro_area: string;
  state: string;
}

interface ResolvedAddress {
  city: string | null;
  zip: string | null;
  state: string | null;
}

export async function geocodeMetro(input: LocationInput): Promise<GeocodeResult | null> {
  const key = process.env.GEOCODING_API_KEY;
  if (!key) return null; // not configured — static lookup only

  let resolved: ResolvedAddress | null = null;
  try {
    resolved = await callProvider(input, key);
  } catch {
    return null; // never block ingestion on a geocoder error
  }
  if (!resolved) return null;

  // Map the cleaned address back onto our canonical metros.
  const zip3 = (resolved.zip ?? '').replace(/\D/g, '').slice(0, 3);
  if (zip3.length === 3 && ZIP3_TO_METRO[zip3]) {
    const hit = ZIP3_TO_METRO[zip3];
    return { metro_area: hit.metro, state: resolved.state ?? hit.state };
  }
  if (resolved.city) {
    const hit = CITY_TO_METRO[normalizeText(resolved.city)];
    if (hit) return { metro_area: hit.metro, state: resolved.state ?? hit.state };
  }
  return null;
}

// Google Geocoding API. Returns the normalized city/ZIP/state components.
async function callProvider(input: LocationInput, key: string): Promise<ResolvedAddress | null> {
  const address = [input.city, input.state, input.zip_code].filter(Boolean).join(', ');
  if (!address) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:US&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    results: { address_components: { long_name: string; short_name: string; types: string[] }[] }[];
  };
  if (data.status !== 'OK' || !data.results.length) return null;

  const components = data.results[0].address_components;
  const pick = (type: string, short = false) => {
    const c = components.find((x) => x.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : null;
  };
  return {
    city: pick('locality') ?? pick('sublocality') ?? pick('administrative_area_level_2'),
    zip: pick('postal_code'),
    state: pick('administrative_area_level_1', true),
  };
}
