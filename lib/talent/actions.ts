'use server';

// Talent-pool management actions. `active` is the toggle that will drive
// dispatch availability in the marketplace phase (Brief §12), so it's a
// first-class, server-controlled boolean from day one.
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/session';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function updateTalent(
  talentId: string,
  patch: { active?: boolean; onboarding_complete?: boolean }
): Promise<ActionResult> {
  try {
    await assertAdmin(); // talent_pool is admin-managed (matches RLS)
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
