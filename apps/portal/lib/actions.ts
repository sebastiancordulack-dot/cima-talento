'use server';

// Portal server actions. Reads go through RLS views; WRITES go through the
// service-role client after the assertBrandClient guard scopes everything to
// the caller's own brand client — the same guard-then-admin pattern the Hub
// uses (clients have no INSERT/UPDATE policies on base tables by design).
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@cima/db/admin';
import { sendSolicitudSubmittedEmails } from '@cima/activaciones/notify';
import { TransitionError, transitionSolicitud } from '@cima/activaciones/transitions';
import { assertBrandClient, PortalAuthError, type BrandClient } from '@/lib/auth';
import type { ChangeResponse, Database } from '@cima/db';

type Solicitud = Database['public']['Tables']['solicitudes']['Row'];
type SolicitudInsert = Database['public']['Tables']['solicitudes']['Insert'];
type SolicitudUpdate = Database['public']['Tables']['solicitudes']['Update'];

export interface SubmitResult {
  ok: boolean;
  /** Primary Solicitud id (the row to land on after submit). */
  id?: string;
  error?: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof PortalAuthError || err instanceof TransitionError) {
    return { ok: false, error: err.message };
  }
  console.error('[portal/actions]', err);
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

/** Trimmed string or null. */
function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** Fetch a solicitud ONLY if it belongs to the caller's brand client. */
async function ownSolicitud(id: string, client: BrandClient): Promise<Solicitud | null> {
  const { data, error } = await createAdminClient()
    .from('solicitudes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.client_id !== client.id) return null;
  return data;
}

// ---- Field validation/builders shared by submit + edit -------------------------

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

function validateLocation(loc: LocationInput, label: string): string | null {
  if (!loc.store_name.trim()) return `${label}: store name is required.`;
  if (!loc.store_address.trim()) return `${label}: store address is required.`;
  if (!TIME_RE.test(loc.time_start) || !TIME_RE.test(loc.time_end)) {
    return `${label}: start and end times are required.`;
  }
  if (!Number.isInteger(loc.num_brand_ambassadors) || loc.num_brand_ambassadors < 1) {
    return `${label}: number of brand ambassadors must be at least 1.`;
  }
  return null;
}

function locationColumns(loc: LocationInput): SolicitudUpdate {
  return {
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
  };
}

export interface FieldEventFields {
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

function validateEvent(p: FieldEventFields): string | null {
  if (!p.event_name.trim()) return 'Event name is required.';
  if (!p.event_address.trim()) return 'Event address is required.';
  if (!DATE_RE.test(p.event_start_date)) return 'Please pick the event start date.';
  const end = DATE_RE.test(p.event_end_date) ? p.event_end_date : p.event_start_date;
  if (end < p.event_start_date) return 'The end date cannot be before the start date.';
  if (!Number.isInteger(p.num_brand_ambassadors) || p.num_brand_ambassadors < 1) {
    return 'Number of brand ambassadors must be at least 1.';
  }
  return null;
}

function eventColumns(p: FieldEventFields): SolicitudUpdate {
  const end = DATE_RE.test(p.event_end_date) ? p.event_end_date : p.event_start_date;
  return {
    event_name: p.event_name.trim(),
    event_venue: clean(p.event_venue),
    event_address: p.event_address.trim(),
    // Inclusive daterange literal — Postgres normalizes the bounds.
    event_dates: `[${p.event_start_date},${end}]`,
    setup_time: TIME_RE.test(p.setup_time) ? p.setup_time : null,
    activation_time_start: TIME_RE.test(p.activation_time_start) ? p.activation_time_start : null,
    activation_time_end: TIME_RE.test(p.activation_time_end) ? p.activation_time_end : null,
    teardown_time: TIME_RE.test(p.teardown_time) ? p.teardown_time : null,
    expected_attendance: clean(p.expected_attendance),
    num_brand_ambassadors: p.num_brand_ambassadors,
    activation_needs: p.activation_needs.filter((n) => n.trim().length > 0),
    activation_vision: clean(p.activation_vision),
    client_supplied_assets: clean(p.client_supplied_assets),
    special_considerations: clean(p.special_considerations),
    budget_range: clean(p.budget_range) as SolicitudUpdate['budget_range'],
  };
}

// ---- Submit (Brief §13.2) --------------------------------------------------------

export interface InStorePayload {
  activation_type: 'in_store';
  brand: string;
  brands_featured: number;
  date: string;
  special_promotions: string;
  comments: string;
  locations: LocationInput[];
}

export interface FieldEventPayload extends FieldEventFields {
  activation_type: 'field_event';
  brand: string;
  brands_featured: number;
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
        const invalid = validateLocation(payload.locations[i], `Location ${i + 1}`);
        if (invalid) return { ok: false, error: invalid };
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
        ...locationColumns(loc),
      }));
    } else {
      const invalid = validateEvent(payload);
      if (invalid) return { ok: false, error: invalid };

      rows = [
        {
          client_id: client.id,
          activation_type: 'field_event',
          brand: payload.brand.trim(),
          brands_featured: payload.brands_featured,
          ...eventColumns(payload),
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
    return failure(err);
  }
}

// ---- Edit Request (Brief §13.4 — while submitted / in_review only) ---------------

const EDITABLE_STATUSES = new Set(['submitted', 'in_review']);

export interface EditInStorePayload {
  activation_type: 'in_store';
  date: string;
  special_promotions: string;
  comments: string;
  location: LocationInput;
}

export interface EditFieldEventPayload extends FieldEventFields {
  activation_type: 'field_event';
}

export type EditPayload = EditInStorePayload | EditFieldEventPayload;

export async function updateSolicitud(id: string, payload: EditPayload): Promise<ActionResult> {
  try {
    const client = await assertBrandClient();
    const solicitud = await ownSolicitud(id, client);
    if (!solicitud) return { ok: false, error: 'Request not found.' };
    if (!EDITABLE_STATUSES.has(solicitud.status)) {
      return {
        ok: false,
        error: 'This request can no longer be edited — please contact your CiMA representative.',
      };
    }
    if (payload.activation_type !== solicitud.activation_type) {
      return { ok: false, error: 'The activation type cannot be changed.' };
    }

    let patch: SolicitudUpdate;
    if (payload.activation_type === 'in_store') {
      if (!DATE_RE.test(payload.date)) return { ok: false, error: 'Please pick an activation date.' };
      const invalid = validateLocation(payload.location, 'Location');
      if (invalid) return { ok: false, error: invalid };
      patch = {
        date: payload.date,
        special_promotions: clean(payload.special_promotions),
        comments: clean(payload.comments),
        ...locationColumns(payload.location),
      };
    } else {
      const invalid = validateEvent(payload);
      if (invalid) return { ok: false, error: invalid };
      patch = eventColumns(payload);
    }

    const { error } = await createAdminClient()
      .from('solicitudes')
      .update(patch)
      .eq('id', id)
      .in('status', ['submitted', 'in_review']); // re-check at write time
    if (error) throw error;

    revalidatePath('/');
    revalidatePath('/requests');
    revalidatePath(`/requests/${id}`);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// ---- Change approval (Brief §8, §13.4) ---------------------------------------------

export async function respondToChange(
  changeId: string,
  response: Extract<ChangeResponse, 'approved' | 'rejected'>
): Promise<ActionResult> {
  try {
    const client = await assertBrandClient();
    const supabase = createAdminClient();

    const { data: change, error } = await supabase
      .from('solicitud_changes')
      .select('*')
      .eq('id', changeId)
      .maybeSingle();
    if (error) throw error;
    if (!change) return { ok: false, error: 'Change not found.' };

    const solicitud = await ownSolicitud(change.solicitud_id, client);
    if (!solicitud) return { ok: false, error: 'Request not found.' };
    if (change.client_response !== 'pending') {
      return { ok: false, error: 'This change has already been answered.' };
    }
    if (solicitud.status !== 'changes_proposed') {
      return { ok: false, error: 'This request is no longer awaiting your response.' };
    }

    // approved → client_approved (CiMA confirms + applies the field change);
    // rejected → back to in_review for CiMA to follow up (§8). The transition
    // is concurrency-guarded and fires the internal nudge (client actor).
    await transitionSolicitud(solicitud.id, response === 'approved' ? 'client_approved' : 'in_review', {
      actorId: client.id,
      actorType: 'client',
    });

    await supabase
      .from('solicitud_changes')
      .update({ client_response: response, client_responded_at: new Date().toISOString() })
      .eq('id', changeId)
      .eq('client_response', 'pending');

    revalidatePath('/');
    revalidatePath('/requests');
    revalidatePath(`/requests/${solicitud.id}`);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// ---- Quote question / pushback -----------------------------------------------------
// Closes the in-platform loop: instead of replying to the nudge email, the
// client sends the quote back to review with their question. The message is
// recorded on the status log (visible in the Hub workspace) and the team gets
// the internal_quote_question nudge.

export async function questionQuote(solicitudId: string, message: string): Promise<ActionResult> {
  try {
    const client = await assertBrandClient();
    const solicitud = await ownSolicitud(solicitudId, client);
    if (!solicitud) return { ok: false, error: 'Request not found.' };
    if (solicitud.status !== 'quote_sent') {
      return { ok: false, error: 'There is no quote awaiting your response on this request.' };
    }
    const text = message.trim();
    if (text.length < 5) return { ok: false, error: 'Please tell us a bit more so our team can help.' };
    if (text.length > 1000) return { ok: false, error: 'Please keep your message under 1,000 characters.' };

    // The quote covers the whole batch, so the whole batch returns to review;
    // the note + internal nudge attach to the row the client acted on.
    let ids = [solicitud.id];
    if (solicitud.batch_id) {
      const { data: members, error } = await createAdminClient()
        .from('solicitudes')
        .select('id,status')
        .eq('batch_id', solicitud.batch_id);
      if (error) throw error;
      ids = (members ?? []).filter((m) => m.status === 'quote_sent').map((m) => m.id);
    }

    for (const id of ids) {
      await transitionSolicitud(id, 'in_review', {
        actorId: client.id,
        actorType: 'client',
        note: id === solicitud.id ? `Pregunta del cliente: ${text}` : null,
        suppressNotify: id !== solicitud.id,
      });
    }

    revalidatePath('/');
    revalidatePath('/requests');
    revalidatePath(`/requests/${solicitudId}`);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// ---- Quote approval (Brief §8, §13.4) ------------------------------------------------

export async function approveQuote(solicitudId: string): Promise<ActionResult> {
  try {
    const client = await assertBrandClient();
    const solicitud = await ownSolicitud(solicitudId, client);
    if (!solicitud) return { ok: false, error: 'Request not found.' };
    if (solicitud.status !== 'quote_sent') {
      return { ok: false, error: 'There is no quote awaiting your approval on this request.' };
    }

    // One quote covers the whole batch (§6A): approving it approves every
    // location still in quote_sent. The internal "confirma el evento" nudge
    // fires once, from the row the client acted on.
    let ids = [solicitud.id];
    if (solicitud.batch_id) {
      const { data: members, error } = await createAdminClient()
        .from('solicitudes')
        .select('id,status')
        .eq('batch_id', solicitud.batch_id);
      if (error) throw error;
      ids = (members ?? []).filter((m) => m.status === 'quote_sent').map((m) => m.id);
    }

    for (const id of ids) {
      await transitionSolicitud(id, 'client_approved', {
        actorId: client.id,
        actorType: 'client',
        suppressNotify: id !== solicitud.id,
      });
    }

    revalidatePath('/');
    revalidatePath('/requests');
    revalidatePath(`/requests/${solicitudId}`);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
