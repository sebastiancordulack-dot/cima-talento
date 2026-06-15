// Meta (Facebook/Instagram) Lead Ads webhook helpers.
//
// Flow: Meta posts a `leadgen` change containing only a `leadgen_id` (NOT the
// answers). We verify the payload signature, then call the Graph API with a
// Page Access Token (needs `leads_retrieval`) to fetch the lead's field_data,
// map it to a CandidateIntake, and hand it to the shared ingestCandidate path.
//
// Security mirrors the Calendly webhook: HMAC over the raw body, fail closed.
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CandidateIntake } from '@/lib/candidates/ingest';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? 'v21.0';

/**
 * Verify Meta's `X-Hub-Signature-256: sha256=<hex>` header — HMAC-SHA256 of the
 * raw request body keyed by the app secret. Fails closed.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
): boolean {
  if (!appSecret || !signatureHeader) return false;
  const [scheme, provided] = signatureHeader.split('=');
  if (scheme !== 'sha256' || !provided) return false;

  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(provided, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** GET subscription handshake: returns the challenge to echo, or null to reject. */
export function verifySubscription(params: URLSearchParams): string | null {
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');
  const expected = process.env.META_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return challenge;
  }
  return null;
}

export interface LeadgenRef {
  leadgen_id: string;
  form_id?: string;
  page_id?: string;
  ad_id?: string;
  created_time?: number;
}

/** Pull leadgen references out of a webhook body, optionally filtered by page. */
export function parseLeadgenRefs(body: unknown): LeadgenRef[] {
  const refs: LeadgenRef[] = [];
  const pageFilter = process.env.META_PAGE_ID;
  const b = body as { object?: string; entry?: { id?: string; changes?: unknown[] }[] };
  if (!b || b.object !== 'page' || !Array.isArray(b.entry)) return refs;

  for (const entry of b.entry) {
    if (pageFilter && entry.id && entry.id !== pageFilter) continue;
    for (const change of entry.changes ?? []) {
      const c = change as { field?: string; value?: Record<string, unknown> };
      if (c.field !== 'leadgen' || !c.value) continue;
      const v = c.value;
      const leadgen_id = (v.leadgen_id ?? v.lead_id) as string | undefined;
      if (!leadgen_id) continue;
      refs.push({
        leadgen_id,
        form_id: v.form_id as string | undefined,
        page_id: (v.page_id as string | undefined) ?? entry.id,
        ad_id: v.ad_id as string | undefined,
        created_time: v.created_time as number | undefined,
      });
    }
  }
  return refs;
}

interface LeadField {
  name: string;
  values: string[];
}

interface LeadDetails {
  id: string;
  field_data: LeadField[];
}

/**
 * Fetch a lead's answers from the Graph API. Throws on network/auth failure so
 * the route can return 5xx and let Meta retry (ingestion is idempotent).
 */
export async function fetchLead(leadgenId: string): Promise<LeadDetails> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('META_PAGE_ACCESS_TOKEN not configured');

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(
    leadgenId
  )}?fields=field_data&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Graph API ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as LeadDetails;
  if (!Array.isArray(data.field_data)) throw new Error('Graph API: missing field_data');
  return data;
}

// Map Meta field `name` keys → our intake. Meta's standard fields keep canonical
// English names even when the label is in Spanish; Spanish aliases cover custom
// questions just in case. Matching is case-insensitive.
const FIELD_ALIASES: Record<keyof Omit<CandidateIntake, 'source_ad_location' | 'submission_id'>, string[]> = {
  email: ['email', 'correo', 'correo_electronico', 'e-mail'],
  first_name: ['first_name', 'nombre'],
  last_name: ['last_name', 'apellido', 'apellidos'],
  phone: ['phone_number', 'phone', 'telefono', 'teléfono', 'celular', 'whatsapp'],
  city: ['city', 'ciudad'],
  state: ['state', 'province', 'estado', 'provincia'],
  zip_code: ['zip_code', 'postal_code', 'zip', 'codigo_postal', 'código_postal', 'cp'],
};

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Map a lead's field_data to a CandidateIntake. Returns null (caller skips) if
 * no email — email is the pipeline's dedup key and Email 1 recipient.
 * Unmapped field names are logged to aid first-run field-mapping verification.
 */
export function mapLeadToIntake(lead: LeadDetails): CandidateIntake | null {
  // name → first value, normalized keys.
  const byName = new Map<string, string>();
  for (const f of lead.field_data) {
    const value = (f.values ?? [])[0];
    if (value != null && value !== '') byName.set(norm(f.name), value);
  }

  const get = (field: keyof typeof FIELD_ALIASES): string | undefined => {
    for (const alias of FIELD_ALIASES[field]) {
      const hit = byName.get(norm(alias));
      if (hit) return hit;
    }
    return undefined;
  };

  const email = get('email');
  if (!email) {
    console.warn(`[meta-lead] lead ${lead.id} skipped: no email. fields=${Array.from(byName.keys()).join(',')}`);
    return null;
  }

  // First/last, or split a single full_name field.
  let first_name = get('first_name');
  let last_name = get('last_name') ?? null;
  if (!first_name) {
    const full = byName.get('full_name') ?? byName.get('nombre_completo');
    if (full) {
      const parts = full.trim().split(/\s+/);
      first_name = parts.shift() ?? full;
      last_name = parts.length ? parts.join(' ') : last_name;
    }
  }

  return {
    first_name: first_name ?? email.split('@')[0],
    last_name,
    email,
    phone: get('phone') ?? null,
    city: get('city') ?? null,
    state: get('state') ?? null,
    zip_code: get('zip_code') ?? null,
    source_ad_location: 'Meta Lead Ad',
    submission_id: lead.id,
  };
}
