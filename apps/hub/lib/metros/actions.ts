'use server';

// Add a metro from the UI (any logged-in staff). Coordinates are auto-located
// from the metro name via geocoding; if that's unavailable, the caller may pass
// coordinates manually. Writes use the service-role client (bypasses RLS),
// matching the talent-pool actions.
import { createAdminClient } from '@cima/db/admin';
import { assertUser } from '@/lib/auth/session';
import { geocodePlaceCoords } from '@/lib/location/geocode';
import { normalizeState } from '@/lib/location/metro-data';
import { invalidateMetrosCache } from '@/lib/location/metros-store';

export interface NewMetroInput {
  metro: string;
  state: string;
  cities?: string[];
  zip3?: string[];
  /** Optional manual coordinates, used only when auto-locate is unavailable. */
  lng?: number;
  lat?: number;
}

export async function addMetro(input: NewMetroInput): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertUser();

    const metro = input.metro.trim();
    const state = normalizeState(input.state) ?? input.state.trim().toUpperCase();
    if (!metro) return { ok: false, error: 'Ingresa el nombre del metro.' };
    if (!state) return { ok: false, error: 'Ingresa el estado (p. ej. CO).' };

    // Resolve coordinates: manual override wins, else auto-locate from the name.
    let lng = input.lng;
    let lat = input.lat;
    if (lng == null || lat == null) {
      const geo = await geocodePlaceCoords(`${metro}, ${state}`);
      if (!geo) {
        return {
          ok: false,
          error:
            'No se pudo ubicar el metro automáticamente. Revisa el nombre/estado o ingresa las coordenadas manualmente.',
        };
      }
      lng = geo.lng;
      lat = geo.lat;
    }

    const cities = (input.cities ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean);
    const zip3 = (input.zip3 ?? [])
      .map((z) => z.replace(/\D/g, '').slice(0, 3))
      .filter((z) => z.length === 3);

    const sb = createAdminClient();
    const { error } = await sb.from('metros').insert({ metro, state, lng, lat, zip3, cities });
    if (error) {
      if (error.code === '23505') return { ok: false, error: `El metro «${metro}» ya existe.` };
      return { ok: false, error: error.message };
    }

    invalidateMetrosCache();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo agregar el metro.' };
  }
}
