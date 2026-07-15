// Candidate ingestion — the platform-agnostic heart of Step 2.
//
// A form-intake webhook (platform TBD, wired at Step 10) normalizes its payload
// into `CandidateIntake` and calls `ingestCandidate`. This module owns the
// rules that don't depend on the form platform:
//   • dedup on email — a resubmission updates the existing record, never
//     creates a duplicate, and never disturbs pipeline progress (Brief §6)
//   • derive metro_area / state on ingestion (Brief §9; stub until Step 10)
//   • a brand-new candidate starts at status `new` and triggers Email 1
//     (Brief §7; actual Resend send wired at Step 3)
//
// Runs with the service-role client (bypasses RLS) — webhook context has no
// user session.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { deriveLocation } from '@/lib/location/metro';
import { sendCandidateEmail } from '@/lib/email/send';
import { emailHash } from '@/lib/candidates/delete';
import { escalateRole } from '@/lib/candidates/roles';
import type { CandidateRole, Database } from '@cima/db';

/** Normalized candidate fields a form adapter must produce. */
export interface CandidateIntake {
  first_name: string;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  city?: string | null;
  zip_code?: string | null;
  state?: string | null;
  source_ad_location?: string | null;
  submission_id?: string | null;
  /** Merch vs promo, classified from the Meta form name; null = sin clasificar. */
  role?: CandidateRole | null;
  meta_form_id?: string | null;
  meta_form_name?: string | null;
}

export interface IngestResult {
  candidate: Database['public']['Tables']['candidates']['Row'];
  /** True when a new record was created (and Email 1 should fire). */
  isNew: boolean;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Ingest a candidate from a form submission. Idempotent on email.
 *
 * @throws if the upsert fails (caller — the webhook — maps this to a 5xx).
 */
export async function ingestCandidate(intake: CandidateIntake): Promise<IngestResult> {
  const supabase = createAdminClient();
  const email = normalizeEmail(intake.email);
  const location = await deriveLocation({
    city: intake.city,
    zip_code: intake.zip_code,
    state: intake.state,
  });

  // Look up an existing candidate by email (the dedup key — Brief §6).
  const { data: existing, error: lookupError } = await supabase
    .from('candidates')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    // Resubmission: refresh contact/location details but leave status, scores,
    // decisions, and timestamps untouched so we don't rewind the pipeline.
    const { data, error } = await supabase
      .from('candidates')
      .update({
        first_name: intake.first_name,
        last_name: intake.last_name ?? existing.last_name,
        phone: intake.phone ?? existing.phone,
        city: intake.city ?? existing.city,
        zip_code: intake.zip_code ?? existing.zip_code,
        metro_area: location.metro_area ?? existing.metro_area,
        state: location.state ?? existing.state,
        source_ad_location: intake.source_ad_location ?? existing.source_ad_location,
        fillout_submission_id: intake.submission_id ?? existing.fillout_submission_id,
        // Escalate-only: promotor → mercaderista on a merch application, never
        // the other way (mercaderistas can already do promo work).
        role: escalateRole(existing.role, intake.role),
        meta_form_id: intake.meta_form_id ?? existing.meta_form_id,
        meta_form_name: intake.meta_form_name ?? existing.meta_form_name,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return { candidate: data, isNew: false };
  }

  // Rejected candidates are deleted outright (migration 0011), so a returning
  // one arrives as brand new. The suppression list remembers the email hash;
  // stamp the flag so staff see "Rechazado anteriormente".
  const { data: priorRejection } = await supabase
    .from('rejected_applicants')
    .select('rejected_at')
    .eq('email_hash', emailHash(email))
    .maybeSingle();

  // New candidate: starts at `new` (the column default; the status-history
  // trigger logs null → new automatically).
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      first_name: intake.first_name,
      last_name: intake.last_name ?? null,
      email,
      phone: intake.phone ?? null,
      city: intake.city ?? null,
      zip_code: intake.zip_code ?? null,
      metro_area: location.metro_area,
      state: location.state,
      source_ad_location: intake.source_ad_location ?? null,
      fillout_submission_id: intake.submission_id ?? null,
      previously_rejected_at: priorRejection?.rejected_at ?? null,
      role: intake.role ?? null,
      meta_form_id: intake.meta_form_id ?? null,
      meta_form_name: intake.meta_form_name ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;

  // New candidate enters `new` → fire Email 1 (Disponibilidad) with the metro's
  // HM Calendly link and log it. Resilient: a send failure is recorded in
  // email_log but never fails ingestion (the candidate must still be saved).
  await sendCandidateEmail(data, 'availability');

  return { candidate: data, isNew: true };
}
