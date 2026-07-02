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
import { normalizeText } from '@/lib/location/metro-data';
import { getMetroLookups } from '@/lib/location/metros-store';
import type { LocationInput } from '@/lib/location/metro';

export interface GeocodeResult {
  metro_area: string;
  state: string;
}

export interface PlaceCoords {
  lng: number;
  lat: number;
  state: string | null;
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
  const { zip3: zip3Map, city: cityMap } = await getMetroLookups();
  const zip3 = (resolved.zip ?? '').replace(/\D/g, '').slice(0, 3);
  if (zip3.length === 3 && zip3Map[zip3]) {
    const hit = zip3Map[zip3];
    return { metro_area: hit.metro, state: resolved.state ?? hit.state };
  }
  if (resolved.city) {
    const hit = cityMap[normalizeText(resolved.city)];
    if (hit) return { metro_area: hit.metro, state: resolved.state ?? hit.state };
  }
  return null;
}

/**
 * Geocode a free-text place ("Denver, CO") to map coordinates for a new metro.
 * Returns null when no key is configured or the place can't be located — the
 * caller then asks the user for coordinates manually.
 */
export async function geocodePlaceCoords(query: string): Promise<PlaceCoords | null> {
  const key = process.env.GEOCODING_API_KEY;
  if (!key || !query.trim()) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:US&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results: {
        geometry: { location: { lat: number; lng: number } };
        address_components: { short_name: string; types: string[] }[];
      }[];
    };
    if (data.status !== 'OK' || !data.results.length) return null;
    const r = data.results[0];
    const state =
      r.address_components.find((c) => c.types.includes('administrative_area_level_1'))?.short_name ??
      null;
    return { lng: r.geometry.location.lng, lat: r.geometry.location.lat, state };
  } catch {
    return null;
  }
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
