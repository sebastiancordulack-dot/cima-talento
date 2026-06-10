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
import { createAdminClient } from '@/lib/supabase/admin';
import { deriveLocation } from '@/lib/location/metro';
import type { Database } from '@/lib/database.types';

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
  const location = deriveLocation({
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
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return { candidate: data, isNew: false };
  }

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
    })
    .select('*')
    .single();

  if (error) throw error;

  // STEP 3: trigger Email 1 (Disponibilidad) via Resend here, using the
  // Calendly link for the candidate's metro's hiring manager, and record it in
  // email_log. Intentionally a no-op until the Resend system is built.
  // await sendAvailabilityEmail(data);

  return { candidate: data, isNew: true };
}
