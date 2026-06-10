// Calendly webhook → automatic candidate status updates (Brief §11).
//
//   invitee.created   new      → scheduled        (HM call booked)
//                     advanced → julia_scheduled  (Julia call booked)
//   invitee.canceled  scheduled       → new       (re-open for rebooking)
//                     julia_scheduled → advanced
//
// Which call a booking refers to is inferred from the candidate's CURRENT
// status, so we don't need to match specific Calendly event types: a candidate
// only has Julia's link once they're `advanced`.
//
// These transitions are NOT in the email trigger map, so they are applied with
// a direct status update (no email) — routing through the email-sending
// transition layer would wrongly re-fire Email 1/Email 3 on a cancellation.
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CandidateStatus, Database } from '@/lib/database.types';

type CandidatePatch = Database['public']['Tables']['candidates']['Update'];

/** Verify Calendly's `Calendly-Webhook-Signature: t=<ts>,v1=<hmac>` header. */
export function verifyCalendlySignature(
  rawBody: string,
  signatureHeader: string | null,
  signingKey: string | undefined,
  toleranceSeconds = 300
): boolean {
  if (!signingKey || !signatureHeader) return false; // fail closed

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;

  // Replay protection: reject stale timestamps.
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;

  const expected = createHmac('sha256', signingKey).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface CalendlyEvent {
  event: string; // "invitee.created" | "invitee.canceled"
  payload?: {
    email?: string;
    scheduled_event?: { start_time?: string };
  };
}

// Status transitions keyed by event then current status. Value: [newStatus,
// which call-time column to stamp]. A missing entry means "ignore".
const CREATED: Partial<Record<CandidateStatus, [CandidateStatus, 'hm_call_at' | 'julia_call_at']>> = {
  new: ['scheduled', 'hm_call_at'],
  advanced: ['julia_scheduled', 'julia_call_at'],
};
const CANCELED: Partial<Record<CandidateStatus, CandidateStatus>> = {
  scheduled: 'new',
  julia_scheduled: 'advanced',
};

export interface CalendlyResult {
  matched: boolean;
  changed: boolean;
  from?: CandidateStatus;
  to?: CandidateStatus;
}

/**
 * Apply a parsed Calendly event to the matching candidate (by invitee email).
 * Direct status update — no email. No-op for events/statuses we don't map.
 */
export async function applyCalendlyEvent(evt: CalendlyEvent): Promise<CalendlyResult> {
  const email = evt.payload?.email?.trim().toLowerCase();
  if (!email) return { matched: false, changed: false };

  const supabase = createAdminClient();
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id,status')
    .eq('email', email)
    .maybeSingle();
  if (!candidate) return { matched: false, changed: false };

  const current = candidate.status as CandidateStatus;

  if (evt.event === 'invitee.created') {
    const mapped = CREATED[current];
    if (!mapped) return { matched: true, changed: false, from: current };
    const [to, timeCol] = mapped;
    const startTime = evt.payload?.scheduled_event?.start_time ?? null;
    const patch: CandidatePatch = { status: to };
    if (timeCol === 'hm_call_at') patch.hm_call_at = startTime;
    else patch.julia_call_at = startTime;
    await supabase.from('candidates').update(patch).eq('id', candidate.id);
    return { matched: true, changed: true, from: current, to };
  }

  if (evt.event === 'invitee.canceled') {
    const to = CANCELED[current];
    if (!to) return { matched: true, changed: false, from: current };
    await supabase.from('candidates').update({ status: to }).eq('id', candidate.id);
    return { matched: true, changed: true, from: current, to };
  }

  return { matched: true, changed: false, from: current };
}
