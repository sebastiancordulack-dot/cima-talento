// Solicitud status presentation + queue-tab grouping (Activaciones Brief §8,
// §12.1, §15). Mirrors lib/candidates/status.ts. No server-only imports —
// safe for client components (badges, tabs).
import type { ActivationType, SolicitudStatus } from '@cima/db';

export interface SolicitudStatusMeta {
  /** Spanish label shown to internal staff. */
  label: string;
  /** Tailwind classes for the color-coded badge (Brief §15 semantic colors). */
  badgeClass: string;
}

export const SOLICITUD_STATUS_META: Record<SolicitudStatus, SolicitudStatusMeta> = {
  submitted:        { label: 'Nueva',                 badgeClass: 'bg-blue-100 text-blue-800 ring-blue-600/20' },
  in_review:        { label: 'En revisión',           badgeClass: 'bg-amber-100 text-amber-800 ring-amber-600/20' },
  changes_proposed: { label: 'Cambio propuesto',      badgeClass: 'bg-violet-100 text-violet-800 ring-violet-600/20' },
  quote_sent:       { label: 'Cotización enviada',    badgeClass: 'bg-violet-100 text-violet-800 ring-violet-600/20' },
  // Hot state: the client said yes — CiMA must lock the event in.
  client_approved:  { label: 'Aprobada por cliente',  badgeClass: 'bg-teal-100 text-teal-800 ring-teal-600/20' },
  confirmed:        { label: 'Confirmada',            badgeClass: 'bg-green-100 text-green-800 ring-green-600/20' },
  in_progress:      { label: 'En curso',              badgeClass: 'bg-green-100 text-green-800 ring-green-600/20' },
  completed:        { label: 'Completada',            badgeClass: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
  cancelled:        { label: 'Cancelada',             badgeClass: 'bg-rose-100 text-rose-800 ring-rose-600/20' },
  rejected:         { label: 'Rechazada',             badgeClass: 'bg-rose-100 text-rose-800 ring-rose-600/20' },
};

export const ACTIVATION_TYPE_META: Record<ActivationType, SolicitudStatusMeta> = {
  in_store:    { label: 'En tienda', badgeClass: 'bg-sky-100 text-sky-800 ring-sky-600/20' },
  field_event: { label: 'Evento',    badgeClass: 'bg-indigo-100 text-indigo-800 ring-indigo-600/20' },
};

// The five queue tabs (Brief §12.1). "cliente" is a follow-up subset of
// "revision" — the two overlap by design. client_approved is not assigned to
// any tab in the brief; it lives in "revision" (the ball is in CiMA's court
// to confirm) so it never sits invisible.
export type QueueTab = 'nuevas' | 'revision' | 'cliente' | 'confirmadas' | 'historial';

export interface QueueTabMeta {
  label: string;
  statuses: SolicitudStatus[];
}

export const QUEUE_TABS: Record<QueueTab, QueueTabMeta> = {
  nuevas:      { label: 'Nuevas',               statuses: ['submitted'] },
  revision:    { label: 'En revisión',          statuses: ['in_review', 'changes_proposed', 'quote_sent', 'client_approved'] },
  cliente:     { label: 'Pendiente de cliente', statuses: ['changes_proposed', 'quote_sent'] },
  confirmadas: { label: 'Confirmadas',          statuses: ['confirmed', 'in_progress'] },
  historial:   { label: 'Historial',            statuses: ['completed', 'cancelled', 'rejected'] },
};

export const QUEUE_TAB_ORDER: QueueTab[] = [
  'nuevas',
  'revision',
  'cliente',
  'confirmadas',
  'historial',
];

export function isQueueTab(value: string | undefined): value is QueueTab {
  return value !== undefined && value in QUEUE_TABS;
}

// ---- Change proposals (Brief §9 solicitud_changes) ----------------------------

export const CHANGE_TYPE_LABELS: Record<string, string> = {
  date_change: 'Cambio de fecha',
  location_change: 'Cambio de ubicación',
  time_change: 'Cambio de horario',
  other: 'Otro cambio',
};

export const CHANGE_RESPONSE_META: Record<string, SolicitudStatusMeta> = {
  pending:  { label: 'Esperando al cliente', badgeClass: 'bg-amber-100 text-amber-800 ring-amber-600/20' },
  approved: { label: 'Aprobado por cliente', badgeClass: 'bg-green-100 text-green-800 ring-green-600/20' },
  rejected: { label: 'Rechazado por cliente', badgeClass: 'bg-rose-100 text-rose-800 ring-rose-600/20' },
};

// ---- Manual status actions (Brief §8, §12.2) ----------------------------------
// The §8 transition map itself lives in @cima/activaciones/machine (shared
// with the Client Portal); transitions.ts validates against it server-side.
// MANUAL_STATUS_ACTIONS is the Hub-UI subset — quote_sent / changes_proposed
// are only reachable through their dedicated flows, never a bare button.
export interface ManualStatusAction {
  to: SolicitudStatus;
  label: string;
  /** Button emphasis: primary advances the flow, danger ends it. */
  tone: 'primary' | 'neutral' | 'danger';
  confirm: string;
}

// The client approves changes/quotes in the portal (Step 7); the staff-side
// "Cliente aprobó" buttons exist so approvals received out-of-band (a call)
// can still be recorded — the actor is logged as cima_staff either way.
export const MANUAL_STATUS_ACTIONS: Record<SolicitudStatus, ManualStatusAction[]> = {
  submitted: [
    { to: 'in_review', label: 'Iniciar revisión', tone: 'primary', confirm: '¿Iniciar la revisión de esta solicitud?' },
    { to: 'rejected', label: 'Rechazar', tone: 'danger', confirm: '¿Rechazar esta solicitud? El cliente será notificado.' },
    { to: 'cancelled', label: 'Cancelar', tone: 'danger', confirm: '¿Cancelar esta solicitud?' },
  ],
  in_review: [
    { to: 'rejected', label: 'Rechazar', tone: 'danger', confirm: '¿Rechazar esta solicitud? El cliente será notificado.' },
    { to: 'cancelled', label: 'Cancelar', tone: 'danger', confirm: '¿Cancelar esta solicitud?' },
  ],
  changes_proposed: [
    { to: 'client_approved', label: 'Cliente aprobó', tone: 'primary', confirm: '¿Registrar que el cliente aprobó el cambio propuesto?' },
    { to: 'in_review', label: 'Reabrir revisión', tone: 'neutral', confirm: '¿Retirar la propuesta y volver a revisión?' },
    { to: 'cancelled', label: 'Cancelar', tone: 'danger', confirm: '¿Cancelar esta solicitud?' },
  ],
  quote_sent: [
    { to: 'client_approved', label: 'Cliente aprobó', tone: 'primary', confirm: '¿Registrar que el cliente aprobó la cotización?' },
    { to: 'in_review', label: 'Reabrir revisión', tone: 'neutral', confirm: '¿Retirar la cotización y volver a revisión?' },
    { to: 'cancelled', label: 'Cancelar', tone: 'danger', confirm: '¿Cancelar esta solicitud?' },
  ],
  client_approved: [
    { to: 'confirmed', label: 'Confirmar evento', tone: 'primary', confirm: '¿Confirmar el evento? Queda agendado en firme.' },
    { to: 'cancelled', label: 'Cancelar', tone: 'danger', confirm: '¿Cancelar esta solicitud?' },
  ],
  confirmed: [
    { to: 'in_progress', label: 'Iniciar ejecución', tone: 'primary', confirm: '¿Marcar el evento como en curso?' },
  ],
  in_progress: [
    { to: 'completed', label: 'Marcar completada', tone: 'primary', confirm: '¿Marcar la activación como completada?' },
  ],
  completed: [],
  cancelled: [],
  rejected: [],
};
