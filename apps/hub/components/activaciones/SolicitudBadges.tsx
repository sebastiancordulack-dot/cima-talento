import {
  ACTIVATION_TYPE_META,
  SOLICITUD_STATUS_META,
} from '@/modules/activaciones/status';
import type { ActivationType, SolicitudStatus } from '@cima/db';

export function SolicitudStatusBadge({ status }: { status: SolicitudStatus }) {
  const meta = SOLICITUD_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

export function ActivationTypeBadge({ type }: { type: ActivationType }) {
  const meta = ACTIVATION_TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}
