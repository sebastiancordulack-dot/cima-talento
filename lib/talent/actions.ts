'use server';

// Talent-pool management actions. The talent pool is managed by all staff
// (hiring managers and admins), so these require a logged-in user but no
// specific role. `active` drives dispatch availability (Brief §12).
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertUser } from '@/lib/auth/session';
import { deriveLocation } from '@/lib/location/metro';
import { normalizeState } from '@/lib/location/metro-data';
import { sendCandidateEmail } from '@/lib/email/send';
import type { Availability } from '@/lib/database.types';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function updateTalent(
  talentId: string,
  patch: { active?: boolean; onboarding_complete?: boolean }
): Promise<ActionResult> {
  try {
    await assertUser();
    const supabase = createAdminClient();
    const { error } = await supabase.from('talent_pool').update(patch).eq('id', talentId);
    if (error) throw error;
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Toggle availability for assignments. */
export async function setTalentActive(talentId: string, active: boolean): Promise<ActionResult> {
  return updateTalent(talentId, { active });
}

/** Mark a member's onboarding complete (or not). */
export async function setOnboardingComplete(talentId: string, value: boolean): Promise<ActionResult> {
  return updateTalent(talentId, { onboarding_complete: value });
}

export interface NewTalentInput {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  metro_area?: string; // optional manual override
  availability?: Availability;
  onboarding_complete?: boolean;
  send_welcome?: boolean;
}

/**
 * Manually add a person to the talent pool. Creates (or reuses, by email) a
 * candidate at status `approved` and a talent_pool record. Metro is taken from
 * the manual override if given, otherwise derived from city/ZIP. The welcome
 * email (Email 4) is sent only when `send_welcome` is set.
 */
export async function addTalentMember(input: NewTalentInput): Promise<ActionResult> {
  try {
    await assertUser();

    const first_name = input.first_name?.trim();
    const email = input.email?.trim().toLowerCase();
    if (!first_name || !email) {
      return { ok: false, error: 'Nombre y correo son obligatorios.' };
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Resolve metro/state: explicit override wins, else derive from city/ZIP.
    const derived = await deriveLocation({
      city: input.city,
      zip_code: input.zip_code,
      state: input.state,
    });
    const metro_area = input.metro_area?.trim() || derived.metro_area;
    const state = (input.state ? normalizeState(input.state) : null) ?? derived.state;

    const contact = {
      first_name,
      last_name: input.last_name?.trim() || null,
      phone: input.phone?.trim() || null,
      city: input.city?.trim() || null,
      zip_code: input.zip_code?.trim() || null,
      metro_area,
      state,
    };

    // Dedup on email: reuse an existing candidate, else create one.
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let candidateId: string;
    if (existing) {
      const { error } = await supabase
        .from('candidates')
        .update({ ...contact, status: 'approved', talent_pool_added_at: now })
        .eq('id', existing.id);
      if (error) throw error;
      candidateId = existing.id;
    } else {
      const { data, error } = await supabase
        .from('candidates')
        .insert({ ...contact, email, status: 'approved', talent_pool_added_at: now })
        .select('id')
        .single();
      if (error) throw error;
      candidateId = data.id;
    }

    const { error: tpErr } = await supabase.from('talent_pool').upsert(
      {
        candidate_id: candidateId,
        metro_area,
        state,
        active: true,
        onboarding_complete: input.onboarding_complete ?? false,
        availability: input.availability ?? {},
      },
      { onConflict: 'candidate_id' }
    );
    if (tpErr) throw tpErr;

    if (input.send_welcome) {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();
      if (candidate) await sendCandidateEmail(candidate, 'welcome');
    }

    revalidatePath('/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Hard-remove a member from the talent pool: delete the pool record and move
 * the candidate to Archivo (status `removed`). The candidate record is kept.
 */
export async function removeTalentMember(talentId: string): Promise<ActionResult> {
  try {
    await assertUser();
    const supabase = createAdminClient();

    const { data: row } = await supabase
      .from('talent_pool')
      .select('candidate_id')
      .eq('id', talentId)
      .maybeSingle();
    if (!row) return { ok: false, error: 'Registro no encontrado.' };

    const { error: delErr } = await supabase.from('talent_pool').delete().eq('id', talentId);
    if (delErr) throw delErr;

    const { error: updErr } = await supabase
      .from('candidates')
      .update({ status: 'removed' })
      .eq('id', row.candidate_id);
    if (updErr) throw updErr;

    revalidatePath('/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
