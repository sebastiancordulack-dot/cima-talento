// Transactional-email hook for Solicitud status changes (Activaciones Brief
// §11). Placeholder until build-order Step 5 wires Resend templates from
// activaciones@cimasales.com — transitions.ts already calls this on every
// status change, so Step 5 only fills in this file (mirroring how Talento's
// transitions call lib/email/send.ts).
import 'server-only';
import type { Database, SolicitudStatus } from '@cima/db';

type Solicitud = Database['public']['Tables']['solicitudes']['Row'];

export async function notifySolicitudStatus(
  _solicitud: Solicitud,
  _toStatus: SolicitudStatus
): Promise<void> {
  // TODO(Step 5): send the matching client/internal nudge email via Resend and
  // log it to activaciones_email_log. Failures must not roll back the
  // transition (same resilience contract as Talento's sendStatusEmail).
}
