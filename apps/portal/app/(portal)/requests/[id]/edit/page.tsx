import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { EditRequestForm } from '@/components/EditRequestForm';
import { getClientSolicitud } from '@/lib/queries';

export const dynamic = 'force-dynamic';

// Edit Request (Brief §13.4) — only while submitted / in_review; afterwards
// changes go through the CiMA team.
export default async function EditRequestPage({ params }: { params: { id: string } }) {
  const detail = await getClientSolicitud(params.id);
  if (!detail) notFound();
  const { solicitud } = detail;

  if (solicitud.status !== 'submitted' && solicitud.status !== 'in_review') {
    redirect(`/requests/${solicitud.id}`);
  }

  const place =
    solicitud.activation_type === 'in_store' ? solicitud.store_name : solicitud.event_name;

  return (
    <div>
      <Link href={`/requests/${solicitud.id}`} className="text-sm text-stone-400 hover:text-stone-600">
        ← Back to request
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">Edit request</h1>
      <p className="mt-1 text-sm text-stone-500">
        {solicitud.brand} · {place}
        {solicitud.batch_id && ' — this edits only this location.'}
      </p>
      <div className="mt-6">
        <EditRequestForm solicitud={solicitud} />
      </div>
    </div>
  );
}
