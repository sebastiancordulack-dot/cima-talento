// One-off backfill: classify pre-existing Meta-lead candidates as mercaderista
// vs promotor/a by looking up each stored lead's form via the Graph API and
// applying the same form-name heuristic the webhook uses (migration 0012).
//
//   npx tsx scripts/backfill-roles.mts            # dry run — report only
//   npx tsx scripts/backfill-roles.mts --apply    # write classifications
//
// Run from apps/hub. Needs META_PAGE_ACCESS_TOKEN (lives in Vercel, not in
// .env.local — `vercel env pull` or export it inline) plus the Supabase URL
// and service-role key already in .env.local.
//
// Meta retains lead data ~90 days: older leads come back as Graph errors and
// are reported as "unavailable" — classify those with the dashboard's
// bulk-assign instead. Candidates it can classify also get meta_form_id/name
// backfilled so their profile shows provenance.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { setTimeout as sleep } from 'node:timers/promises';
import { classifyRoleFromFormName } from '../lib/candidates/roles';
import type { CandidateRole } from '@cima/db';

// --- env / clients -----------------------------------------------------------

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? 'v21.0';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(1);
}
if (!META_TOKEN) {
  console.error(
    'Missing META_PAGE_ACCESS_TOKEN. It lives in Vercel — run `vercel env pull` or:\n' +
      '  META_PAGE_ACCESS_TOKEN=... npx tsx scripts/backfill-roles.mts'
  );
  process.exit(1);
}

// `resend`-style pnpm strictness: resolve @supabase/supabase-js from @cima/db.
const req = createRequire(new URL('../../../packages/db/src/admin.ts', import.meta.url).pathname);
const { createClient } = req('@supabase/supabase-js');
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const apply = process.argv.includes('--apply');

// --- graph helpers -----------------------------------------------------------

async function graphGet(path: string, fields: string): Promise<Record<string, unknown>> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(
    path
  )}?fields=${fields}&access_token=${encodeURIComponent(META_TOKEN!)}`;
  const res = await fetch(url);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (body as { error?: { message?: string } }).error;
    throw new Error(err?.message ?? `Graph API ${res.status}`);
  }
  return body;
}

const formNames = new Map<string, string | null>();
async function formName(formId: string): Promise<string | null> {
  if (formNames.has(formId)) return formNames.get(formId)!;
  let name: string | null = null;
  try {
    name = ((await graphGet(formId, 'name')).name as string | undefined) ?? null;
  } catch (err) {
    console.warn(`  form ${formId}: name fetch failed (${(err as Error).message})`);
  }
  formNames.set(formId, name);
  return name;
}

// --- main --------------------------------------------------------------------

const { data: candidates, error } = await sb
  .from('candidates')
  .select('id,first_name,last_name,email,fillout_submission_id')
  .eq('source_ad_location', 'Meta Lead Ad')
  .is('role', null)
  .not('fillout_submission_id', 'is', null)
  .order('created_at', { ascending: true })
  .limit(5000);
if (error) throw error;

console.log(
  `${apply ? 'APPLY' : 'DRY RUN'} — ${candidates.length} unclassified Meta-lead candidate(s)\n`
);

const tally = { mercaderista: 0, promotor: 0, ambiguous: 0, unavailable: 0, failed_write: 0 };

for (const c of candidates as {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  fillout_submission_id: string;
}[]) {
  const who = `${c.first_name} ${c.last_name ?? ''}`.trim() + ` <${c.email}>`;

  let formId: string | null = null;
  try {
    formId = ((await graphGet(c.fillout_submission_id, 'form_id')).form_id as string) ?? null;
  } catch (err) {
    // Typically the ~90-day retention window: the lead is gone from Meta.
    tally.unavailable++;
    console.log(`✗ ${who} — lead unavailable (${(err as Error).message})`);
    await sleep(150);
    continue;
  }

  const name = formId ? await formName(formId) : null;
  const role: CandidateRole | null = classifyRoleFromFormName(name);

  if (role) tally[role]++;
  else tally.ambiguous++;
  console.log(`${role ? '✓' : '?'} ${who} — form "${name ?? '(sin nombre)'}" → ${role ?? 'sin clasificar'}`);

  if (apply && (role || formId)) {
    const { error: upErr } = await sb
      .from('candidates')
      .update({ ...(role ? { role } : {}), meta_form_id: formId, meta_form_name: name })
      .eq('id', c.id);
    if (upErr) {
      tally.failed_write++;
      console.error(`  write failed for ${who}: ${upErr.message}`);
    }
  }

  await sleep(150); // gentle on Graph API rate limits
}

console.log(
  `\nDone. mercaderista=${tally.mercaderista} promotor=${tally.promotor} ` +
    `sin clasificar (form ambiguo)=${tally.ambiguous} lead no disponible=${tally.unavailable}` +
    (tally.failed_write ? ` ESCRITURAS FALLIDAS=${tally.failed_write}` : '') +
    (apply ? '' : '\n(dry run — nothing written; re-run with --apply)')
);
