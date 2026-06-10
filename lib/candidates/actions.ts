'use server';

// Server actions for the HM dashboard. These run on the server and are the only
// way the UI changes a candidate's state, so the right email always fires
// (Brief §7) and nothing is sent manually.
//
// NOTE (Step 9): once auth lands, each action should verify the caller's role
// and metro scope before mutating. The data mutations themselves already go
// through the service-role transition layer.
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { transitionCandidateStatus } from '@/lib/candidates/transitions';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidateCandidate(id: string) {
  revalidatePath('/dashboard');
  revalidatePath('/julia');
  revalidatePath(`/dashboard/candidates/${id}`);
}

/** HM marks the candidate a fit → status `advanced`, Email 3 (Agenda con Julia). */
export async function markFit(candidateId: string): Promise<ActionResult> {
  try {
    await transitionCandidateStatus(candidateId, 'advanced', {
      patch: { hm_decision: 'fit', hm_call_at: new Date().toISOString() },
    });
    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** HM marks the candidate not a fit → status `rejected_hm`, Email 2 (No es un fit). */
export async function markNotFit(candidateId: string): Promise<ActionResult> {
  try {
    await transitionCandidateStatus(candidateId, 'rejected_hm', {
      patch: { hm_decision: 'not_fit', hm_call_at: new Date().toISOString() },
    });
    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Julia approves → status `approved`, Email 4 (Bienvenido/a) + talent pool.
 *  The talent-pool insert is handled inside the transition layer. */
export async function approveCandidate(candidateId: string): Promise<ActionResult> {
  try {
    await transitionCandidateStatus(candidateId, 'approved', {
      patch: { julia_decision: 'approved', julia_call_at: new Date().toISOString() },
    });
    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Julia does not advance → status `rejected_julia`, Email 5 (No avanza). */
export async function doNotAdvanceCandidate(candidateId: string): Promise<ActionResult> {
  try {
    await transitionCandidateStatus(candidateId, 'rejected_julia', {
      patch: { julia_decision: 'not_approved', julia_call_at: new Date().toISOString() },
    });
    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Save inline call notes — no status change, no email. */
export async function saveNotes(candidateId: string, notes: string): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('candidates')
      .update({ notes: notes.trim() === '' ? null : notes })
      .eq('id', candidateId);
    if (error) throw error;
    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
