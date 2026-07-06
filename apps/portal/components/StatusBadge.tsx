import { CLIENT_STATUS_META } from '@/lib/status';
import type { SolicitudStatus } from '@cima/db';

export function StatusBadge({ status }: { status: SolicitudStatus }) {
  const meta = CLIENT_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}
