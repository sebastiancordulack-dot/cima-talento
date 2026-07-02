// Shared candidate-status presentation + tab grouping for the dashboard.
// No server-only imports — safe to use in client components (badges, tabs).
import type { CandidateStatus } from '@cima/db';

export interface StatusMeta {
  /** Spanish label shown to internal staff. */
  label: string;
  /** Tailwind classes for the color-coded badge. */
  badgeClass: string;
}

export const STATUS_META: Record<CandidateStatus, StatusMeta> = {
  new:             { label: 'Nuevo',                     badgeClass: 'bg-blue-100 text-blue-800 ring-blue-600/20' },
  scheduled:       { label: 'Llamada agendada',          badgeClass: 'bg-indigo-100 text-indigo-800 ring-indigo-600/20' },
  in_review:       { label: 'En revisión',               badgeClass: 'bg-amber-100 text-amber-800 ring-amber-600/20' },
  advanced:        { label: 'Avanzó — pendiente Julia',  badgeClass: 'bg-violet-100 text-violet-800 ring-violet-600/20' },
  julia_scheduled: { label: 'Llamada con Julia agendada', badgeClass: 'bg-purple-100 text-purple-800 ring-purple-600/20' },
  approved:        { label: 'Aprobado',                  badgeClass: 'bg-green-100 text-green-800 ring-green-600/20' },
  rejected_hm:     { label: 'No avanzó (entrevista)',    badgeClass: 'bg-rose-100 text-rose-800 ring-rose-600/20' },
  rejected_julia:  { label: 'No avanzó (Julia)',         badgeClass: 'bg-rose-100 text-rose-800 ring-rose-600/20' },
  no_show:         { label: 'No asistió',                badgeClass: 'bg-gray-100 text-gray-700 ring-gray-500/20' },
  removed:         { label: 'Retirado de la red',        badgeClass: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
  archived:        { label: 'Archivado — futuro',        badgeClass: 'bg-sky-100 text-sky-800 ring-sky-600/20' },
};

// The four dashboard tabs (Brief §5.1), each mapping to a set of statuses.
export type DashboardTab = 'nuevos' | 'proceso' | 'talento' | 'archivo';

export interface TabMeta {
  label: string;
  statuses: CandidateStatus[];
}

export const DASHBOARD_TABS: Record<DashboardTab, TabMeta> = {
  nuevos:  { label: 'Nuevos interesados', statuses: ['new', 'scheduled'] },
  proceso: { label: 'En proceso',         statuses: ['in_review', 'advanced', 'julia_scheduled'] },
  talento: { label: 'Red de talento',     statuses: ['approved'] },
  archivo: { label: 'Archivo',            statuses: ['rejected_hm', 'rejected_julia', 'no_show', 'removed', 'archived'] },
};

export const TAB_ORDER: DashboardTab[] = ['nuevos', 'proceso', 'talento', 'archivo'];

export function isDashboardTab(value: string | undefined): value is DashboardTab {
  return value !== undefined && value in DASHBOARD_TABS;
}
