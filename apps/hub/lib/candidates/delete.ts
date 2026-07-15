// Permanent candidate deletion (migration 0011). Rejections and manual
// Archivo purges remove the person's data entirely — row, resume file, and
// (via FK cascade) status history, email log, and talent-pool record.
//
// Two anonymized traces survive, written here atomically before the delete:
//   • candidate_outcomes — funnel stats (no PII)
//   • rejected_applicants — email hash, so a re-application can be flagged
//     "rechazado anteriormente". Only rejections are recorded; a manual
//     delete from the Archivo is a clean slate.
//
// The optional rejection email is sent BEFORE the delete (its email_log row
// is cascaded away with everything else).
import 'server-only';
import { createHash } from 'crypto';
import { createAdminClient } from '@cima/db/admin';
import { sendCandidateEmail } from '@/lib/email/send';
import { RESUME_BUCKET } from '@/lib/candidates/resume-constants';
import type { CandidateOutcome, EmailType } from '@cima/db';

/** Stable hash for the suppression list — sha256 of the normalized email. */
export function emailHash(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

export interface DeleteCandidateOptions {
  outcome: CandidateOutcome;
  /** Rejection email to send before deleting; null sends nothing. */
  emailType: EmailType | null;
}

/**
 * Hard-delete a candidate. Throws with a staff-readable message when the
 * candidate is gone already or when Postgres blocks the delete (a talent-pool
 * record with worked events is ON DELETE RESTRICT — those people must be
 * deactivated in the Red, never erased from event history).
 */
export async function deleteCandidateRecord(
  candidateId: string,
  options: DeleteCandidateOptions
): Promise<void> {
  const supabase = createAdminClient();

  const { data: candidate, error: fetchError } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!candidate) throw new Error('Candidato no encontrado.');

  if (options.emailType) {
    await sendCandidateEmail(candidate, options.emailType);
  }

  const { error: outcomeError } = await supabase.from('candidate_outcomes').insert({
    applied_at: candidate.created_at.slice(0, 10),
    metro_area: candidate.metro_area,
    state: candidate.state,
    source: candidate.source_ad_location,
    stage_reached: candidate.status,
    outcome: options.outcome,
  });
  if (outcomeError) throw outcomeError;

  if (options.outcome !== 'deleted_from_archive') {
    const { error: hashError } = await supabase.from('rejected_applicants').upsert({
      email_hash: emailHash(candidate.email),
      rejected_at: new Date().toISOString(),
      stage: candidate.status,
    });
    if (hashError) throw hashError;
  }

  // Best-effort: an orphaned file is preferable to blocking the deletion.
  if (candidate.resume_path) {
    await supabase.storage.from(RESUME_BUCKET).remove([candidate.resume_path]);
  }

  const { error: deleteError } = await supabase
    .from('candidates')
    .delete()
    .eq('id', candidateId);
  if (deleteError) {
    if (deleteError.code === '23503') {
      throw new Error(
        'No se puede eliminar: este candidato tiene historial de eventos en Activaciones. Desactívalo en la Red de Talento en su lugar.'
      );
    }
    throw deleteError;
  }
}
