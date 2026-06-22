// Backfill Meta leads that never reached the platform (e.g. while the webhook
// was failing/disabled). Lists every lead from the page's forms since a cutoff,
// then replays each through the LIVE /api/meta-lead endpoint with a valid HMAC —
// reusing the deployed mapping + ingestCandidate (dedup-safe; sends Email 1 to
// applicants who never got it). Doubles as a diagnostic: if listing or the prod
// replay fails, the error pinpoints whether the token is the problem.
//
// 1) Preview (no writes, no emails) — DRY_RUN is the default:
//   META_PAGE_ACCESS_TOKEN=… META_APP_SECRET=… META_PAGE_ID=848582108339882 \
//     node scripts/meta-backfill.mjs
//
// 2) Actually backfill (creates candidates + sends Email 1):
//   ... DRY_RUN=false node scripts/meta-backfill.mjs
//
// Optional: SINCE=2026-06-16 (default: 8 days ago), TARGET_URL, META_GRAPH_VERSION.
import { createHmac } from 'node:crypto';

const TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const SECRET = process.env.META_APP_SECRET;
const PAGE = process.env.META_PAGE_ID;
const V = process.env.META_GRAPH_VERSION ?? 'v21.0';
const URL_ = process.env.TARGET_URL ?? 'https://cima-talento.vercel.app/api/meta-lead';
const DRY = process.env.DRY_RUN !== 'false';
const SINCE = process.env.SINCE
  ? Math.floor(new Date(process.env.SINCE).getTime() / 1000)
  : Math.floor((Date.now() - 8 * 864e5) / 1000);

if (!TOKEN || !PAGE || (!DRY && !SECRET)) {
  console.error('Need META_PAGE_ACCESS_TOKEN, META_PAGE_ID (and META_APP_SECRET unless DRY_RUN).');
  process.exit(1);
}

const base = `https://graph.facebook.com/${V}`;
let pageToken = TOKEN;
async function g(path, params = {}, tok = pageToken) {
  const res = await fetch(`${base}/${path}?${new URLSearchParams({ ...params, access_token: tok })}`);
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json.error ?? json)}`);
  return json;
}

async function listAll(path, params) {
  const out = [];
  let url = `${base}/${path}?${new URLSearchParams({ ...params, access_token: pageToken })}`;
  while (url) {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json.error ?? json)}`);
    out.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }
  return out;
}

function sign(body) {
  return 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');
}

try {
  // Derive a Page token (new Pages experience needs one for listing).
  try {
    const r = await g(PAGE, { fields: 'access_token' }, TOKEN);
    if (r.access_token) pageToken = r.access_token;
  } catch { /* assume already a page token */ }

  console.log(`Cutoff: leads created after ${new Date(SINCE * 1000).toISOString()}  (DRY_RUN=${DRY})\n`);

  const forms = await listAll(`${PAGE}/leadgen_forms`, { fields: 'id,name', limit: '50' });
  let missing = [];
  for (const f of forms) {
    let leads = [];
    try {
      leads = await listAll(`${f.id}/leads`, { fields: 'id,created_time', limit: '100' });
    } catch (e) {
      console.log(`  form ${f.id}: leads error -> ${e.message}`);
      continue;
    }
    const recent = leads.filter((l) => Math.floor(new Date(l.created_time).getTime() / 1000) >= SINCE);
    if (recent.length) {
      console.log(`  form ${f.id} "${f.name ?? ''}": ${recent.length} lead(s) since cutoff`);
      missing.push(...recent.map((l) => ({ ...l, form_id: f.id })));
    }
  }

  console.log(`\nTotal leads since cutoff: ${missing.length}`);
  if (DRY) {
    for (const l of missing) console.log(`  would replay  ${l.id}  (${l.created_time})`);
    console.log('\nDRY RUN — nothing sent. Re-run with DRY_RUN=false to backfill (this sends Email 1).');
    process.exit(0);
  }

  let ok = 0;
  for (const l of missing) {
    const body = JSON.stringify({
      object: 'page',
      entry: [{ id: PAGE, time: Math.floor(Date.now() / 1000), changes: [{ field: 'leadgen', value: { leadgen_id: l.id, page_id: PAGE, form_id: l.form_id } }] }],
    });
    const res = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sign(body) }, body });
    const text = await res.text();
    console.log(`  ${l.id} -> ${res.status} ${text.slice(0, 120)}`);
    if (res.ok) ok++;
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`\nBackfilled ${ok}/${missing.length}. Check the dashboard.`);
} catch (e) {
  console.error('\nFAILED:', e.message);
  console.error('If this is an OAuth/token error, the Page token has expired — that is the root cause; generate a fresh non-expiring System User Page token.');
  process.exit(1);
}
