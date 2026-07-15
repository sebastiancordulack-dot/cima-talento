import type { CandidateRole } from '@cima/db';
import { ROLE_LABELS, ROLE_UNCLASSIFIED_LABEL } from '@/lib/candidates/roles';

// Merch/promo chip, amber when unclassified so pending backfill work is
// visible at a glance (same treatment as the pending-CV chip).
const ROLE_CLASSES: Record<CandidateRole, string> = {
  mercaderista: 'bg-sky-100 text-sky-800',
  promotor: 'bg-violet-100 text-violet-800',
};

export function RoleBadge({ role }: { role: CandidateRole | null }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        role ? ROLE_CLASSES[role] : 'bg-amber-100 text-amber-800'
      }`}
    >
      {role ? ROLE_LABELS[role] : ROLE_UNCLASSIFIED_LABEL}
    </span>
  );
}
