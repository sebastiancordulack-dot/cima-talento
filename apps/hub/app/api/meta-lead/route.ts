// Meta Lead Ads webhook → fetch lead from Graph API → ingest candidate.
//
//   GET  /api/meta-lead   subscription handshake (echoes hub.challenge)
//   POST /api/meta-lead   leadgen events (X-Hub-Signature-256 verified)
//
// Additive and isolated: it reuses the same ingestCandidate() path as Jotform,
// so dedup, metro derivation, Email 1, and status history behave identically.
// Nothing else in the platform changes.
import { NextResponse } from 'next/server';
import { ingestCandidate } from '@/lib/candidates/ingest';
import {
  verifyMetaSignature,
  verifySubscription,
  parseLeadgenRefs,
  fetchLead,
  fetchFormName,
  classifyRoleFromFormName,
  mapLeadToIntake,
} from '@/lib/webhooks/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Subscription handshake -------------------------------------------------
export async function GET(req: Request) {
  const challenge = verifySubscription(new URL(req.url).searchParams);
  if (challenge === null) {
    return NextResponse.json({ error: 'verification failed' }, { status: 403 });
  }
  // Meta requires the raw challenge echoed back as plain text.
  return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } });
}

// --- Leadgen events ---------------------------------------------------------
export async function POST(req: Request) {
  // 1. Verify the signature over the RAW body before doing anything else.
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  if (!verifyMetaSignature(rawBody, signature, process.env.META_APP_SECRET)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  // 2. Parse the leadgen references (the body has no answers, only ids).
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'malformed payload' }, { status: 400 });
  }
  const refs = parseLeadgenRefs(body);
  if (refs.length === 0) {
    // Not a leadgen event we handle (e.g. a different field) — ack so Meta
    // doesn't retry.
    return NextResponse.json({ ok: true, processed: 0 });
  }

  // 3. For each lead: fetch answers, map, ingest. A fetch/ingest error throws
  //    to a 500 so Meta retries; ingestion is idempotent (dedup on email), so a
  //    retry that re-delivers an already-saved lead is harmless.
  const results: { leadgen_id: string; candidateId?: string; isNew?: boolean; skipped?: boolean }[] = [];
  try {
    for (const ref of refs) {
      const lead = await fetchLead(ref.leadgen_id);
      const intake = mapLeadToIntake(lead);
      if (!intake) {
        results.push({ leadgen_id: ref.leadgen_id, skipped: true });
        continue;
      }
      // Classify merch vs promo from the lead form's name (best-effort — a
      // fetch failure or unrecognized name leaves the lead "sin clasificar").
      if (ref.form_id) {
        const formName = await fetchFormName(ref.form_id);
        intake.meta_form_id = ref.form_id;
        intake.meta_form_name = formName;
        intake.role = classifyRoleFromFormName(formName);
      }
      const { candidate, isNew } = await ingestCandidate(intake);
      results.push({ leadgen_id: ref.leadgen_id, candidateId: candidate.id, isNew });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[meta-lead] processing failed:', message);
    return NextResponse.json({ error: 'processing failed', detail: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
