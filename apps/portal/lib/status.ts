// Client-facing status presentation (Brief §13.4): English labels, a
// plain-English explanation of what each status means for the client, and the
// §15 semantic badge colors (consistent with the internal Hub).
import type { SolicitudStatus } from '@cima/db';

export interface ClientStatusMeta {
  label: string;
  /** What this means / what happens next, in the client's words. */
  explanation: string;
  badgeClass: string;
  /** The client must do something (approve a change / a quote). */
  actionNeeded: boolean;
}

export const CLIENT_STATUS_META: Record<SolicitudStatus, ClientStatusMeta> = {
  submitted: {
    label: 'Submitted',
    explanation: "We've received your request and will review it shortly.",
    badgeClass: 'bg-blue-100 text-blue-800 ring-blue-600/20',
    actionNeeded: false,
  },
  in_review: {
    label: 'In review',
    explanation: "We're reviewing your request and will be in touch soon.",
    badgeClass: 'bg-amber-100 text-amber-800 ring-amber-600/20',
    actionNeeded: false,
  },
  changes_proposed: {
    label: 'Change proposed',
    explanation: 'We proposed a change to your request — please review and respond.',
    badgeClass: 'bg-violet-100 text-violet-800 ring-violet-600/20',
    actionNeeded: true,
  },
  quote_sent: {
    label: 'Quote ready',
    explanation: 'Your quote is ready — review it and approve to move forward.',
    badgeClass: 'bg-violet-100 text-violet-800 ring-violet-600/20',
    actionNeeded: true,
  },
  client_approved: {
    label: 'Approved by you',
    explanation: "Thanks for approving — we're locking in the final details.",
    badgeClass: 'bg-teal-100 text-teal-800 ring-teal-600/20',
    actionNeeded: false,
  },
  confirmed: {
    label: 'Confirmed',
    explanation: 'Your activation is locked in. See the details below.',
    badgeClass: 'bg-green-100 text-green-800 ring-green-600/20',
    actionNeeded: false,
  },
  in_progress: {
    label: 'In progress',
    explanation: 'Your activation is underway.',
    badgeClass: 'bg-green-100 text-green-800 ring-green-600/20',
    actionNeeded: false,
  },
  completed: {
    label: 'Completed',
    explanation: 'This activation is complete. Thank you!',
    badgeClass: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    actionNeeded: false,
  },
  cancelled: {
    label: 'Cancelled',
    explanation: 'This request was cancelled.',
    badgeClass: 'bg-rose-100 text-rose-800 ring-rose-600/20',
    actionNeeded: false,
  },
  rejected: {
    label: 'Not able to fulfill',
    explanation: "We weren't able to move forward with this request this time.",
    badgeClass: 'bg-rose-100 text-rose-800 ring-rose-600/20',
    actionNeeded: false,
  },
};

/** Statuses shown on the dashboard as "active" (Brief §13.1). */
export const ACTIVE_STATUSES: SolicitudStatus[] = [
  'submitted',
  'in_review',
  'changes_proposed',
  'quote_sent',
  'client_approved',
  'confirmed',
  'in_progress',
];

export const BUDGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'under_5k', label: 'Under $5k' },
  { value: '5k_10k', label: '$5k – $10k' },
  { value: '10k_20k', label: '$10k – $20k' },
  { value: '20k_plus', label: '$20k+' },
  { value: 'not_defined', label: 'Not yet defined' },
];

/** §6B activation-needs checkboxes, stored verbatim in activation_needs[]. */
export const ACTIVATION_NEEDS = [
  'Branded tent / canopy',
  'Sampling station',
  'Custom branded display or fabricated element',
  'Branded signage, banners, or flags',
  'Giveaways / promotional items',
  'Interactive game or dynamic',
  'Photo / video content creation',
  'Cold product storage / ice cooling solution',
  'Secondary in-store display',
  'Other',
] as const;

export const STORE_TYPES = [
  'Independent Supermarket',
  'Chain Grocery',
  'Wholesale Club',
  'Other',
] as const;
