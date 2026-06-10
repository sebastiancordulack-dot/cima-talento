import { JuliaCandidateCard } from '@/components/JuliaCandidateCard';
import { listJuliaQueue } from '@/lib/candidates/queries';

export const dynamic = 'force-dynamic';

export default async function JuliaPage() {
  const candidates = await listJuliaQueue();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Candidatos para tu aprobación</h1>
        <p className="mt-1 text-sm text-gray-500">
          Aprobados por el equipo de entrevistas, esperando tu llamada y decisión final.
        </p>
      </div>

      {candidates.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-400">
          No hay candidatos esperando aprobación en este momento.
        </p>
      ) : (
        <div className="space-y-4">
          {candidates.map((c) => (
            <JuliaCandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
