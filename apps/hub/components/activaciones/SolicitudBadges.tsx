import { Badge, type BadgeTone } from '@cima/ui';
import {
  ACTIVATION_TYPE_META,
  SOLICITUD_STATUS_META,
} from '@/modules/activaciones/status';
import type { ActivationType, SolicitudStatus } from '@cima/db';

// Unified StatusPill rendering (spec §6). Hues match the original
// SOLICITUD_STATUS_META semantics; labels still come from the meta.
const STATUS_TONES: Record<SolicitudStatus, BadgeTone> = {
  submitted: 'blue',
  in_review: 'amber',
  changes_proposed: 'violet',
  quote_sent: 'violet',
  client_approved: 'teal',
  confirmed: 'green',
  in_progress: 'green',
  completed: 'gray',
  cancelled: 'rose',
  rejected: 'rose',
};

const TYPE_TONES: Record<ActivationType, BadgeTone> = {
  in_store: 'sky',
  field_event: 'indigo',
};

export function SolicitudStatusBadge({ status }: { status: SolicitudStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]} dot>
      {SOLICITUD_STATUS_META[status].label}
    </Badge>
  );
}

export function ActivationTypeBadge({ type }: { type: ActivationType }) {
  return <Badge tone={TYPE_TONES[type]}>{ACTIVATION_TYPE_META[type].label}</Badge>;
}
