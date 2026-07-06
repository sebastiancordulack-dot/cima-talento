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
