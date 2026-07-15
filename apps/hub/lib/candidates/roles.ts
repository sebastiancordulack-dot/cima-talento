// Candidate roles — mercaderista vs promotor/a (migration 0012).
//
// Pure and client/server safe (type-only import), like nuevos-filters. The
// role is classified at ingestion from the Meta form name; null means
// "sin clasificar" and staff assign it manually.
import type { CandidateRole } from '@cima/db';

export const CANDIDATE_ROLES: CandidateRole[] = ['mercaderista', 'promotor'];

export const ROLE_LABELS: Record<CandidateRole, string> = {
  mercaderista: 'Mercaderista',
  promotor: 'Promotor/a',
};

export const ROLE_UNCLASSIFIED_LABEL = 'Sin clasificar';

export function isCandidateRole(value: unknown): value is CandidateRole {
  return value === 'mercaderista' || value === 'promotor';
}

// Escalate-only rule: mercaderistas can double as promo staff, so re-applying
// through the promo ad never downgrades them; a promotor who applies through
// the merch ad is upgraded. Staff can still override manually in either
// direction from the profile.
const RANK: Record<CandidateRole, number> = { promotor: 1, mercaderista: 2 };

export function escalateRole(
  current: CandidateRole | null,
  incoming: CandidateRole | null | undefined
): CandidateRole | null {
  if (!incoming) return current;
  if (!current || RANK[incoming] > RANK[current]) return incoming;
  return current;
}

/** Promo staff schedule their call directly — no CV gate (mercaderistas and
 *  unclassified leads keep the CV requirement). */
export function resumeRequired(role: CandidateRole | null): boolean {
  return role !== 'promotor';
}
