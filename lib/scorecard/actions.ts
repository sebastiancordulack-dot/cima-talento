'use server';

// Scorecard submission. Recomputes the total server-side (never trusts the
// client), enforces the hard-filter gate (Brief §14), persists everything to
// the candidate, and applies the HM's decision via the email-triggering
// transition layer:
//   • fit     → advanced     (Email 3 — Agenda con Julia)
//   • not_fit → rejected_hm  (Email 2 — No es un fit)
//   • draft   → in_review    (saved, no email)
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { transitionCandidateStatus } from '@/lib/candidates/transitions';
import { assertCandidateAccess } from '@/lib/auth/session';
import {
  computeTotal,
  scoresComplete,
  buildScorecardData,
  validateDecision,
  type ScorecardPayload,
  type ScorecardDecision,
} from '@/lib/scorecard/scoring';
import type { Database } from '@/lib/database.types';

type CandidatePatch = Database['public']['Tables']['candidates']['Update'];

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

// Statuses from which a "draft" save may move the candidate into in_review.
const PRE_DECISION = new Set(['new', 'scheduled', 'in_review']);

export async function submitScorecard(
  candidateId: string,
  payload: ScorecardPayload,
  decision: ScorecardDecision
): Promise<SubmitResult> {
  const invalid = validateDecision(payload, decision);
  if (invalid) return { ok: false, error: invalid.message };

  try {
    await assertCandidateAccess(candidateId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Build the field patch shared by every decision. Keys in hardFilters/bonus
  // are exactly the candidate column names.
  const patch: CandidatePatch = {
    ...payload.hardFilters,
    ...payload.bonus,
    score_total: scoresComplete(payload) ? computeTotal(payload) : null,
    scorecard_data: buildScorecardData(payload),
    notes: payload.generalNotes.trim() === '' ? null : payload.generalNotes,
  };

  try {
    if (decision === 'draft') {
      const supabase = createAdminClient();
      const { data: current } = await supabase
        .from('candidates')
        .select('status')
        .eq('id', candidateId)
        .single();

      const draftPatch: CandidatePatch = { ...patch };
      if (current && PRE_DECISION.has(current.status)) {
        draftPatch.status = 'in_review';
        draftPatch.hm_call_at ??= new Date().toISOString();
      }
      const { error } = await supabase.from('candidates').update(draftPatch).eq('id', candidateId);
      if (error) throw error;
    } else {
      const now = new Date().toISOString();
      const newStatus = decision === 'fit' ? 'advanced' : 'rejected_hm';
      await transitionCandidateStatus(candidateId, newStatus, {
        patch: {
          ...patch,
          hm_decision: decision,
          hm_call_at: now,
        },
      });
    }

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/candidates/${candidateId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
