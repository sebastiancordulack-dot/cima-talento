// Jotform → CandidateIntake adapter.
//
// Jotform posts submissions as form-data containing a `rawRequest` JSON blob
// whose keys are `q{qid}_{name}` (the qid is unique to this form). We match by
// the `q{qid}_` prefix so a field rename in the builder won't break parsing.
//
// Field map for form 261605489959071 (fetched from the Jotform API):
//   q3 fullname  → first_name + last_name
//   q4 email     → email
//   q5 phone     → phone
//   q7 textbox   → city
//   q8 textbox   → state
//   q9 textbox   → zip_code
import type { CandidateIntake } from '@/lib/candidates/ingest';

export const JOTFORM_FORM_ID = process.env.JOTFORM_FORM_ID ?? '261605489959071';

const QID = {
  fullName: '3',
  email: '4',
  phone: '5',
  city: '7',
  state: '8',
  zip: '9',
} as const;

export type JotformRawRequest = Record<string, unknown>;

/** First rawRequest value whose key starts with `q{qid}_`. */
function valueForQid(raw: JotformRawRequest, qid: string): unknown {
  const prefix = `q${qid}_`;
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith(prefix)) return value;
  }
  return undefined;
}

function asString(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return null;
}

/** Jotform fullname sends { first, middle, last, prefix, suffix }. */
function parseName(v: unknown): { first: string | null; last: string | null } {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return { first: asString(o.first), last: asString(o.last) };
  }
  // Fallback: a single string → split on first space.
  const s = asString(v);
  if (!s) return { first: null, last: null };
  const [first, ...rest] = s.split(/\s+/);
  return { first, last: rest.length ? rest.join(' ') : null };
}

/** Phone may be { full } / { area, phone } / a plain string. */
function parsePhone(v: unknown): string | null {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const full = asString(o.full);
    if (full) return full;
    const area = asString(o.area);
    const phone = asString(o.phone);
    const joined = [area, phone].filter(Boolean).join(' ').trim();
    return joined === '' ? null : joined;
  }
  return asString(v);
}

/**
 * Build a CandidateIntake from a parsed rawRequest. Returns null when there's
 * no email — email is the dedup key, so a submission without it can't be
 * ingested (the caller should 400).
 */
export function parseCandidateFromRawRequest(
  raw: JotformRawRequest,
  submissionId?: string | null
): CandidateIntake | null {
  const email = asString(valueForQid(raw, QID.email));
  if (!email) return null;

  const { first, last } = parseName(valueForQid(raw, QID.fullName));

  return {
    first_name: first ?? '(sin nombre)',
    last_name: last,
    email,
    phone: parsePhone(valueForQid(raw, QID.phone)),
    city: asString(valueForQid(raw, QID.city)),
    state: asString(valueForQid(raw, QID.state)),
    zip_code: asString(valueForQid(raw, QID.zip)),
    submission_id: submissionId ?? null,
  };
}
