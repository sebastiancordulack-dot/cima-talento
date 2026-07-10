import { Badge, type BadgeTone } from '@cima/ui';
import { CLIENT_STATUS_META } from '@/lib/status';
import type { SolicitudStatus } from '@cima/db';

// Unified pill (spec §6) — same tones as the Hub's SolicitudStatusBadge so a
// status reads identically on both sides; labels stay client-friendly English.
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

export function StatusBadge({ status }: { status: SolicitudStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]} dot>
      {CLIENT_STATUS_META[status].label}
    </Badge>
  );
}
