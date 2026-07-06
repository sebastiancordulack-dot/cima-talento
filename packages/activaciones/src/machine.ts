// The Solicitud status machine (Activaciones Brief §8) — shared by the Hub
// workspace and the Client Portal so both sides validate against the same
// map. cancelled is allowed at any point BEFORE confirmed; after that the
// flow only moves forward. quote_sent / changes_proposed are only reachable
// through their dedicated flows.
import type { SolicitudStatus } from '@cima/db';

export const SOLICITUD_TRANSITIONS: Record<SolicitudStatus, SolicitudStatus[]> = {
  submitted:        ['in_review', 'cancelled', 'rejected'],
  in_review:        ['changes_proposed', 'quote_sent', 'cancelled', 'rejected'],
  changes_proposed: ['client_approved', 'in_review', 'cancelled', 'rejected'],
  quote_sent:       ['client_approved', 'in_review', 'cancelled', 'rejected'],
  client_approved:  ['confirmed', 'cancelled'],
  confirmed:        ['in_progress'],
  in_progress:      ['completed'],
  completed:        [],
  cancelled:        [],
  rejected:         [],
};
