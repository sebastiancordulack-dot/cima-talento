// Candidate roles — mercaderista vs promotor/a (migration 0012).
//
// Pure and client/server safe (no server-only imports), like nuevos-filters.
// The role is classified at ingestion from the Meta form name; null means
// "sin clasificar" and staff assign it manually.
import { normalizeText } from '@/lib/location/metro-data';
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

/**
 * Classify a Meta lead form's name: 'merca…' → mercaderista, 'promo…'/'edecán'
 * → promotor, else null (ambiguous or silent → sin clasificar). Shared by the
 * webhook (live leads) and scripts/backfill-roles.mts (historical leads).
 */
export function classifyRoleFromFormName(name: string | null): CandidateRole | null {
  if (!name) return null;
  const n = normalizeText(name);
  const merch = n.includes('merca'); // mercaderista(s), mercadeo
  const promo = n.includes('promo') || n.includes('edecan'); // promotor(a/es), promotoria
  if (merch && !promo) return 'mercaderista';
  if (promo && !merch) return 'promotor';
  return null;
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
