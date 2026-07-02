import { STATUS_META } from '@/lib/candidates/status';
import type { CandidateStatus } from '@cima/db';

export function StatusBadge({ status }: { status: CandidateStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}
