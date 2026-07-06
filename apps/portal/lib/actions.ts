'use server';

// Portal server actions. Reads go through RLS views; WRITES go through the
// service-role client after the assertBrandClient guard scopes everything to
// the caller's own brand client — the same guard-then-admin pattern the Hub
// uses (clients have no INSERT policy on base tables by design).
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@cima/db/admin';
import { sendSolicitudSubmittedEmails } from '@cima/activaciones/notify';
import { assertBrandClient, PortalAuthError } from '@/lib/auth';
import type { Database } from '@cima/db';

type SolicitudInsert = Database['public']['Tables']['solicitudes']['Insert'];

export interface SubmitResult {
  ok: boolean;
  /** Primary Solicitud id (the row to land on after submit). */
  id?: string;
  error?: string;
}

/** Trimmed string or null. */
function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export interface LocationInput {
  store_name: string;
  store_address: string;
  store_type: string;
  store_contact_name: string;
  store_contact_phone: string;
  distributor_rep_name: string;
  product_quantity: string;
  time_start: string;
  time_end: string;
  num_brand_ambassadors: number;
}

export interface InStorePayload {
  activation_type: 'in_store';
  brand: string;
  brands_featured: number;
  date: string;
  special_promotions: string;
  comments: string;
  locations: LocationInput[];
}

export interface FieldEventPayload {
  activation_type: 'field_event';
  brand: string;
  brands_featured: number;
  event_name: string;
  event_venue: string;
  event_address: string;
  event_start_date: string;
  event_end_date: string;
  setup_time: string;
  activation_time_start: string;
  activation_time_end: string;
  teardown_time: string;
  expected_attendance: string;
  num_brand_ambassadors: number;
  activation_needs: string[];
  activation_vision: string;
  client_supplied_assets: string;
  special_considerations: string;
  budget_range: string;
}

export type SubmitPayload = InStorePayload | FieldEventPayload;

export async function submitSolicitud(payload: SubmitPayload): Promise<SubmitResult> {
  try {
    const client = await assertBrandClient();

    if (!payload.brand.trim()) return { ok: false, error: 'Please select a brand.' };
    if (![1, 2].includes(payload.brands_featured)) {
      return { ok: false, error: 'Brands featured must be 1 or 2.' };
    }

    let rows: SolicitudInsert[];

    if (payload.activation_type === 'in_store') {
      if (!DATE_RE.test(payload.date)) return { ok: false, error: 'Please pick an activation date.' };
      if (payload.locations.length === 0) {
        return { ok: false, error: 'Add at least one location.' };
      }
      for (let i = 0; i < payload.locations.length; i++) {
        const loc = payload.locations[i];
        const n = i + 1;
        if (!loc.store_name.trim()) return { ok: false, error: `Location ${n}: store name is required.` };
        if (!loc.store_address.trim()) return { ok: false, error: `Location ${n}: store address is required.` };
        if (!TIME_RE.test(loc.time_start) || !TIME_RE.test(loc.time_end)) {
          return { ok: false, error: `Location ${n}: start and end times are required.` };
        }
        if (!Number.isInteger(loc.num_brand_ambassadors) || loc.num_brand_ambassadors < 1) {
          return { ok: false, error: `Location ${n}: number of brand ambassadors must be at least 1.` };
        }
      }

      // One internal record per location, linked by batch_id (Brief §5).
      const batchId = payload.locations.length > 1 ? crypto.randomUUID() : null;
      rows = payload.locations.map((loc) => ({
        client_id: client.id,
        activation_type: 'in_store',
        brand: payload.brand.trim(),
        brands_featured: payload.brands_featured,
        batch_id: batchId,
        date: payload.date,
        special_promotions: clean(payload.special_promotions),
        comments: clean(payload.comments),
        store_name: loc.store_name.trim(),
        store_address: loc.store_address.trim(),
        store_type: clean(loc.store_type),
        store_contact_name: clean(loc.store_contact_name),
        store_contact_phone: clean(loc.store_contact_phone),
        distributor_rep_name: clean(loc.distributor_rep_name),
        product_quantity: clean(loc.product_quantity),
        time_start: loc.time_start,
        time_end: loc.time_end,
        num_brand_ambassadors: loc.num_brand_ambassadors,
      }));
    } else {
      if (!payload.event_name.trim()) return { ok: false, error: 'Event name is required.' };
      if (!payload.event_address.trim()) return { ok: false, error: 'Event address is required.' };
      if (!DATE_RE.test(payload.event_start_date)) {
        return { ok: false, error: 'Please pick the event start date.' };
      }
      const end = DATE_RE.test(payload.event_end_date)
        ? payload.event_end_date
        : payload.event_start_date;
      if (end < payload.event_start_date) {
        return { ok: false, error: 'The end date cannot be before the start date.' };
      }
      if (!Number.isInteger(payload.num_brand_ambassadors) || payload.num_brand_ambassadors < 1) {
        return { ok: false, error: 'Number of brand ambassadors must be at least 1.' };
      }

      rows = [
        {
          client_id: client.id,
          activation_type: 'field_event',
          brand: payload.brand.trim(),
          brands_featured: payload.brands_featured,
          event_name: payload.event_name.trim(),
          event_venue: clean(payload.event_venue),
          event_address: payload.event_address.trim(),
          // Inclusive daterange literal — Postgres normalizes the bounds.
          event_dates: `[${payload.event_start_date},${end}]`,
          setup_time: TIME_RE.test(payload.setup_time) ? payload.setup_time : null,
          activation_time_start: TIME_RE.test(payload.activation_time_start)
            ? payload.activation_time_start
            : null,
          activation_time_end: TIME_RE.test(payload.activation_time_end)
            ? payload.activation_time_end
            : null,
          teardown_time: TIME_RE.test(payload.teardown_time) ? payload.teardown_time : null,
          expected_attendance: clean(payload.expected_attendance),
          num_brand_ambassadors: payload.num_brand_ambassadors,
          activation_needs: payload.activation_needs.filter((n) => n.trim().length > 0),
          activation_vision: clean(payload.activation_vision),
          client_supplied_assets: clean(payload.client_supplied_assets),
          special_considerations: clean(payload.special_considerations),
          budget_range: clean(payload.budget_range) as SolicitudInsert['budget_range'],
        },
      ];
    }

    const { data: inserted, error } = await createAdminClient()
      .from('solicitudes')
      .insert(rows)
      .select('*');
    if (error) throw error;
    const primary = inserted![0];

    // §11 rows 1 + 6: one confirmation to the client, one internal alert —
    // per submission, not per location. Resilient; never blocks the submit.
    await sendSolicitudSubmittedEmails(primary, inserted!.length);

    revalidatePath('/');
    revalidatePath('/requests');
    return { ok: true, id: primary.id };
  } catch (err) {
    if (err instanceof PortalAuthError) return { ok: false, error: err.message };
    console.error('[portal/submit]', err);
    return { ok: false, error: 'Something went wrong submitting your request. Please try again.' };
  }
}
