// Auth + authorization helpers (Brief §10, revised 2026-07: metros are no
// longer an access wall — see migration 0010).
//
//   admin / julia    → everything, including approve to the talent pool and
//                       Julia decisions
//   hiring_manager   → sees and acts on candidates in ALL metros; cannot
//                       approve to the talent pool
//
// assigned_metros stays on hiring_managers as informational data only.
//
// Pages use the redirect guards (requireUser/requireAdmin). Server actions use
// the throwing asserts, whose messages surface as the action's error string.
import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@cima/db/server';
import { createAdminClient } from '@cima/db/admin';
import type { UserRole } from '@cima/db';

export interface SessionUser {
  id: string; // auth.users id
  email: string;
  hm: {
    id: string;
    name: string;
    role: UserRole;
    assigned_metros: string[];
  } | null;
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'julia';
}

/** Current signed-in user + their hiring_managers row, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS lets a user read their own hiring_managers row.
  const { data: hm } = await supabase
    .from('hiring_managers')
    .select('id,name,role,assigned_metros')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  return { id: user.id, email: user.email ?? '', hm: hm ?? null };
}

// ---- Page guards (redirect) ------------------------------------------------

/**
 * Signed-in AND internal staff (has a hiring_managers row). Both apps share
 * one Supabase Auth instance, so a brand-client login is a valid *user* — the
 * hm check is what actually keeps portal accounts out of the Hub (Brief §10).
 * Non-staff sessions land on /sin-acceso (not /login, which would loop).
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.hm) redirect('/sin-acceso');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminRole(user.hm?.role)) redirect('/dashboard');
  return user;
}

// ---- Action guards (throw; message becomes the action error) ---------------

export class AuthError extends Error {}

export async function assertUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError('No has iniciado sesión.');
  if (!user.hm) throw new AuthError('Tu cuenta no está vinculada a un perfil de equipo.');
  return user;
}

export async function assertAdmin(): Promise<SessionUser> {
  const user = await assertUser();
  if (!isAdminRole(user.hm?.role)) throw new AuthError('Solo un administrador puede realizar esta acción.');
  return user;
}

/** Ensure the caller is staff and the candidate exists. Metros no longer
 *  restrict access (migration 0010) — any active staff may act on any
 *  candidate; the existence check keeps action errors human-readable. */
export async function assertCandidateAccess(candidateId: string): Promise<SessionUser> {
  const user = await assertUser();

  const { data: candidate } = await createAdminClient()
    .from('candidates')
    .select('id')
    .eq('id', candidateId)
    .maybeSingle();
  if (!candidate) throw new AuthError('Candidato no encontrado.');
  return user;
}
