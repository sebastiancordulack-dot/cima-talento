import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ScorecardForm } from '@/components/ScorecardForm';
import { getCandidateProfile } from '@/lib/candidates/queries';
import { SCORED_QUESTIONS } from '@/lib/scorecard/questions';
import { emptyPayload, type ScorecardPayload } from '@/lib/scorecard/scoring';
import { fullName } from '@/lib/format';
import type { Database } from '@cima/db';

export const dynamic = 'force-dynamic';

type Candidate = Database['public']['Tables']['candidates']['Row'];

// Pull a per-question score/note out of scorecard_data, tolerating both the
// { score, note } and bare-number shapes.
function readEntry(data: Record<string, unknown>, key: string): { score: number | null; note: string } {
  const raw = data[key];
  if (typeof raw === 'number') return { score: raw, note: '' };
  if (raw && typeof raw === 'object') {
    const o = raw as { score?: unknown; note?: unknown };
    return {
      score: typeof o.score === 'number' ? o.score : null,
      note: typeof o.note === 'string' ? o.note : '',
    };
  }
  return { score: null, note: '' };
}

// Prefill the form from whatever's already saved on the candidate.
function payloadFromCandidate(c: Candidate): ScorecardPayload {
  const data = (c.scorecard_data ?? {}) as Record<string, unknown>;
  const base = emptyPayload();
  return {
    hardFilters: {
      has_vehicle: c.has_vehicle,
      work_authorized: c.work_authorized,
      available_mf: c.available_mf,
      works_independently: c.works_independently,
    },
    scores: Object.fromEntries(SCORED_QUESTIONS.map((q) => [q.key, readEntry(data, q.key).score])),
    notes: Object.fromEntries(SCORED_QUESTIONS.map((q) => [q.key, readEntry(data, q.key).note])),
    bonus: {
      bilingual: c.bilingual ?? false,
      prior_experience: c.prior_experience ?? false,
      app_comfortable: c.app_comfortable ?? false,
    },
    generalNotes: c.notes ?? base.generalNotes,
  };
}

export default async function ScorecardPage({ params }: { params: { id: string } }) {
  const profile = await getCandidateProfile(params.id);
  if (!profile) notFound();
  const { candidate } = profile;
  const name = fullName(candidate.first_name, candidate.last_name);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/dashboard/candidates/${candidate.id}`} className="text-sm text-stone-400 hover:text-stone-600">
        ← Volver al perfil
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Scorecard · {name}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {candidate.metro_area ?? candidate.city ?? 'Sin metro asignado'}
        </p>
      </div>
      <ScorecardForm
        candidateId={candidate.id}
        candidateName={candidate.first_name}
        initial={payloadFromCandidate(candidate)}
      />
    </div>
  );
}
