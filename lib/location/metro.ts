// Location derivation — city/ZIP → metro area + state.
//
// STEP 10 will replace the stub below with a real static city→metro lookup for
// CiMA's operating states (NY, NJ, CT, MA, RI, MD, VA, DC, IL, GA, TN, TX, FL,
// and growing) plus a geocoding fallback (Brief §9). The signature is stable so
// the ingestion path doesn't change when the mapping lands.

export interface DerivedLocation {
  metro_area: string | null;
  state: string | null;
}

export interface LocationInput {
  city?: string | null;
  zip_code?: string | null;
  state?: string | null;
}

/**
 * Derive metro area + state from a candidate's city/ZIP.
 *
 * Stub: passes through any state already supplied and leaves metro_area null.
 * A null metro_area is intentionally visible to all hiring managers (RLS), so
 * candidates never fall through the cracks before they're mapped.
 */
export function deriveLocation(input: LocationInput): DerivedLocation {
  return {
    metro_area: null,
    state: input.state ?? null,
  };
}
