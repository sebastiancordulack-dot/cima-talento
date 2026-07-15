'use client';

import Link from 'next/link';
import { buttonClasses } from '@cima/ui';
import { StatusBadge } from '@/components/StatusBadge';
import { CandidateActions } from '@/components/CandidateActions';
import { CandidateNotes } from '@/components/CandidateNotes';
import { RestoreTalentControl } from '@/components/talent/RestoreTalentControl';
import { ReactivateButton } from '@/components/ReactivateButton';
import { MetroAssignControl } from '@/components/MetroAssignControl';
import { RoleAssignControl } from '@/components/RoleAssignControl';
import { RoleBadge } from '@/components/RoleBadge';
import { WhatsAppBumpButton } from '@/components/WhatsAppBumpButton';
import { PreviouslyRejectedBadge } from '@/components/PreviouslyRejectedBadge';
import { resumeRequired } from '@/lib/candidates/roles';
import { formatDate, fullName } from '@/lib/format';
import type { Candidate } from '@/lib/candidates/queries';

// The decision buttons themselves (fit/no-fit, aprobar, archivar, eliminar)
// live in CandidateActions, shared with the profile page.
const SCORECARD_STATUSES = new Set(['new', 'scheduled', 'in_review']);

export function CandidateCard({
  candidate,
  metros,
  isAdmin,
}: {
  candidate: Candidate;
  metros: string[];
  isAdmin: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/dashboard/candidates/${candidate.id}`}
            className="font-semibold text-stone-900 hover:text-brand-700 hover:underline"
          >
            {fullName(candidate.first_name, candidate.last_name)}
          </Link>
          <p className="mt-0.5 text-sm text-stone-500">
            {candidate.metro_area ?? candidate.city ?? 'Sin metro asignado'}
            {candidate.state ? ` · ${candidate.state}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <RoleBadge role={candidate.role} />
            {(candidate.resume_uploaded_at || resumeRequired(candidate.role)) && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  candidate.resume_uploaded_at
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {candidate.resume_uploaded_at ? 'CV ✓' : 'CV pendiente'}
              </span>
            )}
            <PreviouslyRejectedBadge rejectedAt={candidate.previously_rejected_at} />
          </div>
        </div>
        <StatusBadge status={candidate.status} />
      </div>

      {(candidate.metro_area === null || candidate.role === null) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {candidate.metro_area === null && (
            <MetroAssignControl
              candidateId={candidate.id}
              current={candidate.metro_area}
              metros={metros}
              size="sm"
            />
          )}
          {candidate.role === null && (
            <RoleAssignControl candidateId={candidate.id} current={candidate.role} size="sm" />
          )}
        </div>
      )}

      <dl className="mt-3 space-y-1 text-sm text-stone-600">
        <div className="flex gap-2">
          <dt className="text-stone-400">Email</dt>
          <dd className="truncate">{candidate.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-stone-400">Teléfono</dt>
          <dd>{candidate.phone ?? '—'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-stone-400">Recibido</dt>
          <dd>{formatDate(candidate.created_at)}</dd>
        </div>
      </dl>

      <div className="mt-3">
        <CandidateNotes candidateId={candidate.id} initialNotes={candidate.notes} />
      </div>

      <div className="mt-4 space-y-2">
        <CandidateActions
          candidateId={candidate.id}
          firstName={candidate.first_name}
          status={candidate.status}
          isAdmin={isAdmin}
          size="sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          {SCORECARD_STATUSES.has(candidate.status) && (
            <Link
              href={`/dashboard/candidates/${candidate.id}/scorecard`}
              className={buttonClasses('secondary')}
            >
              Scorecard
            </Link>
          )}
          {candidate.status === 'removed' && <RestoreTalentControl prefill={candidate} size="sm" />}
          {candidate.status === 'archived' && (
            <ReactivateButton candidateId={candidate.id} candidateName={candidate.first_name} size="sm" />
          )}
          {!candidate.resume_uploaded_at && resumeRequired(candidate.role) && (
            <WhatsAppBumpButton
              candidateId={candidate.id}
              firstName={candidate.first_name}
              phone={candidate.phone}
              uploadToken={candidate.upload_token}
              lastBumpedAt={candidate.last_bumped_at}
              size="sm"
            />
          )}
          <Link
            href={`/dashboard/candidates/${candidate.id}`}
            className={buttonClasses('ghost')}
          >
            Ver perfil
          </Link>
        </div>
      </div>
    </div>
  );
}
