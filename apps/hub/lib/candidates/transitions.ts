// Candidate status transitions — the single place pipeline status changes flow
// through, so the right email always fires automatically (Brief §7) and no
// candidate is ever left without a status (Brief §14).
//
// Steps 4 (HM dashboard) and 6 (Julia view) call this instead of updating
// `status` directly. The status-history row is written by the DB trigger; the
// matching email is sent here via sendStatusEmail.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { sendStatusEmail, type SendResult } from '@/lib/email/send';
import type { Database, CandidateStatus } from '@cima/db';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type CandidatePatch = Database['public']['Tables']['candidates']['Update'];

export interface TransitionOptions {
  /** Extra candidate fields to write atomically with the status (decisions,
   *  scorecard, call timestamps, notes). */
  patch?: CandidatePatch;
  /** hiring_managers.id who made the change — recorded on the history row. */
  actorId?: string | null;
}

export interface TransitionResult {
  candidate: Candidate;
  email: SendResult | null;
}

/**
 * Move a candidate to `newStatus`, apply any field patch, fire the matching
 * email, and (on approval) add them to the talent pool.
 *
 * The email send is resilient — a failure is logged to email_log but does not
 * roll back the status change.
 */
export async function transitionCandidateStatus(
  candidateId: string,
  newStatus: CandidateStatus,
  options: TransitionOptions = {}
): Promise<TransitionResult> {
  const supabase = createAdminClient();

  const patch: CandidatePatch = { ...options.patch, status: newStatus };
  if (newStatus === 'approved' && patch.talent_pool_added_at === undefined) {
    patch.talent_pool_added_at = new Date().toISOString();
  }

  const { data: candidate, error } = await supabase
    .from('candidates')
    .update(patch)
    .eq('id', candidateId)
    .select('*')
    .single();
  if (error) throw error;

  // Stamp the actor on the history row the status trigger just inserted.
  if (options.actorId) {
    await supabase
      .from('candidate_status_history')
      .update({ changed_by: options.actorId })
      .eq('candidate_id', candidateId)
      .eq('to_status', newStatus)
      .is('changed_by', null);
  }

  if (newStatus === 'approved') {
    await addToTalentPool(candidate);
  }

  const email = await sendStatusEmail(candidate);
  return { candidate, email };
}

/** Idempotently create the candidate's talent-pool record on approval. */
async function addToTalentPool(candidate: Candidate): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('talent_pool')
    .upsert(
      {
        candidate_id: candidate.id,
        metro_area: candidate.metro_area,
        state: candidate.state,
        active: true,
        onboarding_complete: false,
      },
      { onConflict: 'candidate_id' }
    );
}
