// Spanish display labels for the email log (Brief §5.1). No server-only imports
// — usable from server or client components.
import type { EmailType, EmailStatus } from '@cima/db';

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  availability: 'Email 1 — Disponibilidad',
  rejection_hm: 'Email 2 — No es un fit',
  schedule_julia: 'Email 3 — Agenda con Julia',
  welcome: 'Email 4 — Bienvenido/a',
  rejection_julia: 'Email 5 — No avanza',
  archived: 'Email — Archivo (en espera)',
};

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  queued: 'En cola',
  sent: 'Enviado',
  delivered: 'Entregado',
  failed: 'Falló',
  bounced: 'Rebotado',
};
