// Solicitud status transitions — the single place status changes flow through
// (Activaciones Brief §8), so transitions are always validated, milestones
// stamped, the trigger-written log row attributed, and (Step 5) the matching
// nudge email fired. Mirrors lib/candidates/transitions.ts.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { notifySolicitudStatus } from './notify';
import { SOLICITUD_TRANSITIONS } from './machine';
import type { Database, SolicitudActor, SolicitudStatus } from '@cima/db';

type Solicitud = Database['public']['Tables']['solicitudes']['Row'];
type SolicitudPatch = Database['public']['Tables']['solicitudes']['Update'];

export class TransitionError extends Error {}

export interface SolicitudTransitionOptions {
  /** Who made the change — recorded on the status-log row the trigger wrote. */
  actorId?: string | null;
  actorType?: SolicitudActor;
  /** Optional context stored on the log row (internal-only; Brief §9). */
  note?: string | null;
  /** Extra fields written atomically with the status. */
  patch?: SolicitudPatch;
  /** Skip the §11 email for this row — batch operations transition N rows but
   *  must nudge the client exactly once. */
  suppressNotify?: boolean;
}

/**
 * Move a Solicitud to `to`, validating against the §8 transition map. Stamps
 * confirmed_at / completed_at milestones, attributes the auto-logged history
 * row, and hands off to the (Step 5) email hook — which must never roll back
 * the transition.
 */
export async function transitionSolicitud(
  solicitudId: string,
  to: SolicitudStatus,
  options: SolicitudTransitionOptions = {}
): Promise<Solicitud> {
  const supabase = createAdminClient();

  const { data: current, error: fetchError } = await supabase
    .from('solicitudes')
    .select('id,status,confirmed_at,completed_at')
    .eq('id', solicitudId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!current) throw new TransitionError('Solicitud no encontrada.');

  if (!SOLICITUD_TRANSITIONS[current.status].includes(to)) {
    throw new TransitionError(
      `Transición no permitida: ${current.status} → ${to}.`
    );
  }

  const patch: SolicitudPatch = { ...options.patch, status: to };
  if (to === 'confirmed' && !current.confirmed_at) {
    patch.confirmed_at = new Date().toISOString();
  }
  if (to === 'completed' && !current.completed_at) {
    patch.completed_at = new Date().toISOString();
  }

  // Guard the update on the status we validated against, so two staff members
  // acting at once can't double-apply a transition.
  const { data: updated, error } = await supabase
    .from('solicitudes')
    .update(patch)
    .eq('id', solicitudId)
    .eq('status', current.status)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!updated) {
    throw new TransitionError('La solicitud cambió de estado mientras trabajabas — recarga la página.');
  }

  // Attribute the log row the status trigger just inserted (same pattern as
  // Talento: trigger writes the transition, app stamps the actor).
  if (options.actorId || options.note) {
    await supabase
      .from('solicitud_status_log')
      .update({
        changed_by: options.actorId ?? null,
        actor_type: options.actorType ?? 'cima_staff',
        note: options.note ?? null,
      })
      .eq('solicitud_id', solicitudId)
      .eq('to_status', to)
      .is('changed_by', null)
      .is('note', null);
  }

  await notifySolicitudStatus(updated, to, {
    from: current.status,
    actorType: options.actorType,
    suppress: options.suppressNotify,
    note: options.note,
  });
  return updated;
}
