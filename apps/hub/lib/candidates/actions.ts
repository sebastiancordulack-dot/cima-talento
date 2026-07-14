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
import { createAdminClient } from '@cima/db/admin';
import { transitionCandidateStatus } from '@/lib/candidates/transitions';
import { deleteCandidateRecord } from '@/lib/candidates/delete';
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

/** Staff marks the candidate not a fit → optional rejection email (Email 2),
 *  then the candidate's data is permanently deleted (migration 0011). Only an
 *  anonymous funnel row and the email hash survive. */
export async function markNotFit(
  candidateId: string,
  options: { sendEmail?: boolean } = {}
): Promise<ActionResult> {
  try {
    await assertCandidateAccess(candidateId);
    await deleteCandidateRecord(candidateId, {
      outcome: 'rejected_hm',
      emailType: options.sendEmail !== false ? 'rejection_hm' : null,
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

/** Julia does not advance → optional rejection email (Email 5), then the
 *  candidate's data is permanently deleted (migration 0011). */
export async function doNotAdvanceCandidate(
  candidateId: string,
  options: { sendEmail?: boolean } = {}
): Promise<ActionResult> {
  try {
    await assertAdmin();
    await deleteCandidateRecord(candidateId, {
      outcome: 'rejected_julia',
      emailType: options.sendEmail !== false ? 'rejection_julia' : null,
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

/** Any staff archives the candidate for the future → status `archived`. The
 *  Archivo is the "promise for the future" pool — a softer alternative to
 *  rejecting. The warm "kept on file" email is optional (staff choose in the
 *  confirm dialog); default is to send it. */
export async function archiveCandidate(
  candidateId: string,
  options: { sendEmail?: boolean } = {}
): Promise<ActionResult> {
  try {
    const user = await assertCandidateAccess(candidateId);
    await transitionCandidateStatus(candidateId, 'archived', {
      actorId: user.hm?.id ?? null,
      sendEmail: options.sendEmail !== false,
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

/** Permanently delete a candidate sitting in the Archivo tab. No email — the
 *  person already received their close-out email when they entered the
 *  Archivo. Same total deletion as a rejection, but without adding them to
 *  the re-applicant suppression list (clean slate). */
export async function deleteFromArchive(candidateId: string): Promise<ActionResult> {
  try {
    await assertCandidateAccess(candidateId);

    // Only candidates already out of the active pipeline can be purged here.
    const { data: cand } = await createAdminClient()
      .from('candidates')
      .select('status')
      .eq('id', candidateId)
      .maybeSingle();
    const archivoStatuses = ['archived', 'rejected_hm', 'rejected_julia', 'no_show', 'removed'];
    if (!cand || !archivoStatuses.includes(cand.status)) {
      return { ok: false, error: 'Solo se pueden eliminar candidatos del Archivo.' };
    }

    await deleteCandidateRecord(candidateId, {
      outcome: 'deleted_from_archive',
      emailType: null,
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
