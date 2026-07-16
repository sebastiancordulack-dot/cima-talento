// Role backfill for pre-0012 Meta-lead candidates, run WHERE THE TOKEN LIVES.
//
// The local script (scripts/backfill-roles.mts) needs META_PAGE_ACCESS_TOKEN,
// which is a sensitive Vercel env var that can't be viewed or exported. This
// module runs the same classification inside the deployed hub instead — the
// admin route at /api/admin/backfill-roles calls it with the token already in
// the runtime environment.
//
// Per candidate: stored lead (fillout_submission_id) → Graph API form_id →
// form name (cached in meta.ts) → classifyRoleFromFormName. Batched (serverless
// time limits) and resumable: it only selects candidates with no role AND no
// meta_form_id, and in apply mode always stamps meta_form_id — including a
// sentinel for leads Meta no longer retains (~90 days) — so every processed
// candidate leaves the queue and `remaining` converges to zero.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { classifyRoleFromFormName } from '@/lib/candidates/roles';
import { fetchFormName } from '@/lib/webhooks/meta';
import type { CandidateRole } from '@cima/db';

/** meta_form_id stamped when the lead is gone from Meta (retention window);
 *  never a real form id, so it can't collide or mislead the profile view. */
export const FORM_UNAVAILABLE = 'unavailable';

export interface BackfillRow {
  email: string;
  name: string;
  formName: string | null;
  role: CandidateRole | null;
  status: 'classified' | 'ambiguous' | 'lead_unavailable' | 'write_failed';
}

export interface BackfillReport {
  apply: boolean;
  scanned: number;
  /** Unprocessed candidates left AFTER this batch (0 = done). */
  remaining: number;
  tally: { mercaderista: number; promotor: number; ambiguous: number; lead_unavailable: number; write_failed: number };
  rows: BackfillRow[];
}

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? 'v21.0';

/** A lead's form_id from the Graph API. Throws when the lead is unavailable
 *  (typically past Meta's ~90-day lead retention). */
async function fetchLeadFormId(leadgenId: string): Promise<string | null> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('META_PAGE_ACCESS_TOKEN not configured');
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(
    leadgenId
  )}?fields=form_id&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const body = (await res.json().catch(() => ({}))) as {
    form_id?: string;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body.error?.message ?? `Graph API ${res.status}`);
  return body.form_id ?? null;
}

export async function backfillRoles(options: {
  apply: boolean;
  limit: number;
}): Promise<BackfillReport> {
  const { apply, limit } = options;
  const supabase = createAdminClient();

  const base = () =>
    supabase
      .from('candidates')
      .select('id,first_name,last_name,email,fillout_submission_id', { count: 'exact' })
      .eq('source_ad_location', 'Meta Lead Ad')
      .is('role', null)
      .is('meta_form_id', null)
      .not('fillout_submission_id', 'is', null);

  const { data: candidates, count, error } = await base()
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;

  const tally = { mercaderista: 0, promotor: 0, ambiguous: 0, lead_unavailable: 0, write_failed: 0 };
  const rows: BackfillRow[] = [];

  for (const c of candidates ?? []) {
    const name = `${c.first_name} ${c.last_name ?? ''}`.trim();

    let formId: string | null = null;
    try {
      formId = await fetchLeadFormId(c.fillout_submission_id!);
    } catch {
      tally.lead_unavailable++;
      rows.push({ email: c.email, name, formName: null, role: null, status: 'lead_unavailable' });
      if (apply) {
        await supabase
          .from('candidates')
          .update({ meta_form_id: FORM_UNAVAILABLE })
          .eq('id', c.id);
      }
      continue;
    }

    const formName_ = formId ? await fetchFormName(formId) : null;
    const role = classifyRoleFromFormName(formName_);
    let status: BackfillRow['status'] = role ? 'classified' : 'ambiguous';
    if (role) tally[role]++;
    else tally.ambiguous++;

    if (apply) {
      const { error: upErr } = await supabase
        .from('candidates')
        .update({
          ...(role ? { role } : {}),
          meta_form_id: formId ?? FORM_UNAVAILABLE,
          meta_form_name: formName_,
        })
        .eq('id', c.id);
      if (upErr) {
        status = 'write_failed';
        tally.write_failed++;
      }
    }

    rows.push({ email: c.email, name, formName: formName_, role, status });
  }

  // Queue size after this batch. In dry-run nothing was stamped, so subtract
  // what a real run would have consumed instead of re-counting.
  let remaining: number;
  if (apply) {
    const { count: left } = await base().limit(1);
    remaining = left ?? 0;
  } else {
    remaining = Math.max(0, (count ?? rows.length) - rows.length);
  }

  return { apply, scanned: rows.length, remaining, tally, rows };
}
