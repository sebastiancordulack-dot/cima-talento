// Read-only Meta Lead Ads diagnostic. Confirms the System User token works,
// the Page subscription is live, lists lead forms, and dumps the field_data of
// recent leads (including testing-tool leads) so the field mapping can be
// verified against the real form. No writes, no side effects.
//
// Run (secrets stay in your shell, never in the repo):
//   META_PAGE_ACCESS_TOKEN=EAAB... META_PAGE_ID=848582108339882 \
//     node scripts/meta-diagnose.mjs
//
// Optional: META_GRAPH_VERSION (default v21.0), META_FORM_ID to inspect one form.

const TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const PAGE = process.env.META_PAGE_ID;
const V = process.env.META_GRAPH_VERSION ?? 'v21.0';
const ONE_FORM = process.env.META_FORM_ID;

if (!TOKEN || !PAGE) {
  console.error('Set META_PAGE_ACCESS_TOKEN and META_PAGE_ID env vars.');
  process.exit(1);
}

const base = `https://graph.facebook.com/${V}`;

// The "new Pages experience" requires a PAGE access token for page-scoped reads
// and for fetching leads. If a user / system-user token is provided, derive a
// page token from it (system-user-derived page tokens don't expire).
let pageToken = TOKEN;

async function get(path, params = {}, tok = pageToken) {
  const res = await fetch(`${base}/${path}?${new URLSearchParams({ ...params, access_token: tok })}`);
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json.error ?? json)}`);
  return json;
}

async function derivePageToken() {
  try {
    const r = await get(PAGE, { fields: 'access_token' }, TOKEN);
    if (r.access_token && r.access_token !== TOKEN) {
      pageToken = r.access_token;
      console.log('Derived a Page access token from the provided token.');
      console.log('  → Use THIS value for META_PAGE_ACCESS_TOKEN in Vercel:');
      console.log(`  ${pageToken}\n`);
    }
  } catch {
    console.log('(Provided token used as-is — assuming it is already a Page token.)\n');
  }
}

function dumpLead(lead) {
  console.log(`    lead ${lead.id}  (${lead.created_time ?? '?'})`);
  for (const f of lead.field_data ?? []) {
    console.log(`      • name="${f.name}"  value=${JSON.stringify((f.values ?? [])[0] ?? '')}`);
  }
}

try {
  await derivePageToken();

  console.log('=== 1. Token / page identity ===');
  const page = await get(PAGE, { fields: 'name,id' });
  console.log(`OK  page = ${page.name} (${page.id})`);

  console.log('\n=== 2. Subscribed apps (should include "leadgen") ===');
  const subs = await get(`${PAGE}/subscribed_apps`);
  for (const a of subs.data ?? []) {
    console.log(`  app ${a.id ?? a.name ?? '?'}  fields=${JSON.stringify(a.subscribed_fields ?? [])}`);
  }

  console.log('\n=== 3. Lead forms ===');
  const forms = ONE_FORM
    ? { data: [{ id: ONE_FORM }] }
    : await get(`${PAGE}/leadgen_forms`, { fields: 'id,name,status,leads_count', limit: '25' });
  for (const f of forms.data ?? []) {
    console.log(`  form ${f.id}  status=${f.status ?? '?'}  leads=${f.leads_count ?? '?'}  "${f.name ?? ''}"`);
  }

  console.log('\n=== 4. Recent leads + field_data (this is what locks the mapping) ===');
  for (const f of forms.data ?? []) {
    let leads;
    try {
      leads = await get(`${f.id}/leads`, { fields: 'id,created_time,field_data', limit: '3' });
    } catch (e) {
      console.log(`  form ${f.id}: leads error -> ${e.message}`);
      continue;
    }
    if (!leads.data?.length) {
      console.log(`  form ${f.id}: no leads`);
      continue;
    }
    console.log(`  form ${f.id} "${f.name ?? ''}":`);
    leads.data.forEach(dumpLead);
  }

  console.log('\nDone. Paste sections 2 and 4 back and I will confirm/adjust the mapping.');
} catch (e) {
  console.error('\nFAILED:', e.message);
  console.error('If this is a (#100) leads_retrieval / permission error, the token is missing leads_retrieval or the System User lacks Page access.');
  process.exit(1);
}
