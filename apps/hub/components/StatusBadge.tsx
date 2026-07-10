import { Badge, type BadgeTone } from '@cima/ui';
import { STATUS_META } from '@/lib/candidates/status';
import type { CandidateStatus } from '@cima/db';

// Unified pill (spec §6) — hues follow the original STATUS_META semantics;
// labels still come from the meta.
const STATUS_TONES: Record<CandidateStatus, BadgeTone> = {
  new: 'blue',
  scheduled: 'indigo',
  in_review: 'amber',
  advanced: 'violet',
  julia_scheduled: 'violet',
  approved: 'green',
  rejected_hm: 'rose',
  rejected_julia: 'rose',
  no_show: 'gray',
  removed: 'gray',
  archived: 'sky',
};

export function StatusBadge({ status }: { status: CandidateStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]} dot>
      {STATUS_META[status].label}
    </Badge>
  );
}
