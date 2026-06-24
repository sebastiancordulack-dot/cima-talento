'use server';

// Server actions for the HM dashboard. These run on the server and are the only
// way the UI changes a candidate's state, so the right email always fires
// (Brief §7) and nothing is sent manually.
//
// Each action authorizes the caller first (Brief §10): HMs may act on
// candidates in their assigned metros; only admins/Julia may approve to (or
// reject from) the talent pool. The mutations themselves run through the
// service-role transition layer, so the guard is the access boundary.
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { transitionCandidateStatus } from '@/lib/candidates/transitions';
import { getMetros } from '@/lib/location/metros-store';
import { assertCandidateAccess, assertAdmin } from '@/lib/auth/session';

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
    const user = await assertCandidateAccess(candidateId);
    await transitionCandidateStatus(candidateId, 'advanced', {
      patch: { hm_decision: 'fit', hm_call_at: new Date().toISOString() },
      actorId: user.hm?.id ?? null,
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
    const user = await assertCandidateAccess(candidateId);
    await transitionCandidateStatus(candidateId, 'rejected_hm', {
      patch: { hm_decision: 'not_fit', hm_call_at: new Date().toISOString() },
      actorId: user.hm?.id ?? null,
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
    const user = await assertAdmin();
    await transitionCandidateStatus(candidateId, 'approved', {
      patch: { julia_decision: 'approved', julia_call_at: new Date().toISOString() },
      actorId: user.hm?.id ?? null,
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
    const user = await assertAdmin();
    await transitionCandidateStatus(candidateId, 'rejected_julia', {
      patch: { julia_decision: 'not_approved', julia_call_at: new Date().toISOString() },
      actorId: user.hm?.id ?? null,
    });
    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Manually assign (or change) a candidate's metro — needed for leads that
 * arrive without a resolvable location, e.g. Meta Lead Ads (Brief §9). Any
 * staff who can see the candidate may route it; unassigned candidates are
 * visible to all HMs, so they can be picked up. The metro must be one from the
 * catalog. Backfills `state` from the metro only when the candidate has none,
 * and keeps an existing talent-pool row in sync.
 */
export async function assignMetro(candidateId: string, metro: string): Promise<ActionResult> {
  try {
    await assertCandidateAccess(candidateId);
    const name = metro.trim();
    if (!name) return { ok: false, error: 'Selecciona un metro.' };

    const match = (await getMetros()).find((m) => m.metro === name);
    if (!match) return { ok: false, error: 'Metro desconocido.' };

    const supabase = createAdminClient();
    const { data: cand } = await supabase
      .from('candidates')
      .select('state')
      .eq('id', candidateId)
      .maybeSingle();

    const patch: { metro_area: string; state?: string } = { metro_area: name };
    if (!cand?.state) patch.state = match.state;

    const { error } = await supabase.from('candidates').update(patch).eq('id', candidateId);
    if (error) throw error;

    // Keep a talent-pool row (if any) pointed at the same metro.
    await supabase.from('talent_pool').update({ metro_area: name }).eq('candidate_id', candidateId);

    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Julia archives the candidate for the future → status `archived`, sends the
 *  warm "kept on file" email. A softer alternative to "No avanzar". */
export async function archiveCandidate(candidateId: string): Promise<ActionResult> {
  try {
    const user = await assertAdmin();
    await transitionCandidateStatus(candidateId, 'archived', {
      patch: { julia_call_at: new Date().toISOString() },
      actorId: user.hm?.id ?? null,
    });
    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Reopen an archived candidate back into the active pipeline (→ `in_review`).
 *  No email — it's an internal move; the normal flow resumes from there. */
export async function reactivateCandidate(candidateId: string): Promise<ActionResult> {
  try {
    const user = await assertCandidateAccess(candidateId);
    await transitionCandidateStatus(candidateId, 'in_review', {
      actorId: user.hm?.id ?? null,
    });
    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Record that a WhatsApp bump was sent (Tier-1 click-to-chat). No status
 *  change, no email, no server-side message — just stamps last_bumped_at so the
 *  dashboard shows who has already been nudged and staff avoid double-texting. */
export async function bumpCandidate(candidateId: string): Promise<ActionResult> {
  try {
    await assertCandidateAccess(candidateId);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('candidates')
      .update({ last_bumped_at: new Date().toISOString() })
      .eq('id', candidateId);
    if (error) throw error;
    revalidateCandidate(candidateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Save inline call notes — no status change, no email. */
export async function saveNotes(candidateId: string, notes: string): Promise<ActionResult> {
  try {
    await assertCandidateAccess(candidateId);
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
