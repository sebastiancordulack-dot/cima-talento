// Replay a real Meta lead through the LIVE /api/meta-lead endpoint with a valid
// HMAC signature — proves signature verification + Graph fetch + ingestCandidate
// in production, independent of Meta's delivery / testing tool.
//
// SIDE EFFECTS: this ingests the lead for real — it creates/updates a candidate
// and sends Email 1 to whatever email the lead contains (test leads use
// placeholder emails). Delete the test candidate afterward if you don't want it.
//
// Run with a real leadgen_id from scripts/meta-diagnose.mjs:
//   META_APP_SECRET=xxxx META_PAGE_ID=848582108339882 LEADGEN_ID=123456 \
//     node scripts/meta-replay.mjs
//
// Optional: META_FORM_ID, TARGET_URL (default production).
import { createHmac } from 'node:crypto';

const SECRET = process.env.META_APP_SECRET;
const PAGE = process.env.META_PAGE_ID;
const LEADGEN_ID = process.env.LEADGEN_ID;
const FORM_ID = process.env.META_FORM_ID;
const URL_ = process.env.TARGET_URL ?? 'https://cima-talento.vercel.app/api/meta-lead';

if (!SECRET || !PAGE || !LEADGEN_ID) {
  console.error('Set META_APP_SECRET, META_PAGE_ID, and LEADGEN_ID env vars.');
  process.exit(1);
}

const body = JSON.stringify({
  object: 'page',
  entry: [
    {
      id: PAGE,
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'leadgen',
          value: {
            leadgen_id: LEADGEN_ID,
            page_id: PAGE,
            form_id: FORM_ID ?? null,
            created_time: Math.floor(Date.now() / 1000),
          },
        },
      ],
    },
  ],
});

const signature = 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');

console.log(`POST ${URL_}`);
const res = await fetch(URL_, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature },
  body,
});
const text = await res.text();
console.log(`-> ${res.status}`);
console.log(text);

if (res.status === 401) console.log('\n401 = signature rejected: META_APP_SECRET here must match the one in Vercel.');
if (res.status === 500) console.log('\n500 = signature OK but Graph fetch/ingest failed (check the leadgen_id is real and the prod token has leads_retrieval).');
if (res.ok) console.log('\nOK — check the dashboard for the candidate (it should also have received Email 1).');
