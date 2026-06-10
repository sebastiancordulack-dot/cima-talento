// Jotform submission webhook → ingest candidate → fire Email 1.
//
// Endpoint:  POST /api/webhooks/jotform?token=<JOTFORM_WEBHOOK_TOKEN>
//
// Jotform has no native webhook signing, so we authenticate two ways:
//   1. a secret token in the URL (must equal JOTFORM_WEBHOOK_TOKEN)
//   2. the submission's formID must equal JOTFORM_FORM_ID
// Both must pass before we touch the database.
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { ingestCandidate } from '@/lib/candidates/ingest';
import {
  JOTFORM_FORM_ID,
  parseCandidateFromRawRequest,
  type JotformRawRequest,
} from '@/lib/webhooks/jotform';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenValid(provided: string | null): boolean {
  const expected = process.env.JOTFORM_WEBHOOK_TOKEN;
  if (!expected || !provided) return false; // fail closed
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  // 1. Secret token in the URL.
  const token = new URL(req.url).searchParams.get('token');
  if (!tokenValid(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Read the submission. Jotform sends multipart/form-data; tolerate JSON.
  let formID: string | null = null;
  let submissionId: string | null = null;
  let raw: JotformRawRequest = {};
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as Record<string, unknown>;
      formID = (body.formID as string) ?? null;
      submissionId = (body.submissionID as string) ?? null;
      raw =
        typeof body.rawRequest === 'string'
          ? (JSON.parse(body.rawRequest) as JotformRawRequest)
          : ((body.rawRequest as JotformRawRequest) ?? (body as JotformRawRequest));
    } else {
      const form = await req.formData();
      formID = (form.get('formID') as string) ?? null;
      submissionId = (form.get('submissionID') as string) ?? null;
      const rawRequest = form.get('rawRequest');
      raw = typeof rawRequest === 'string' ? (JSON.parse(rawRequest) as JotformRawRequest) : {};
    }
  } catch {
    return NextResponse.json({ error: 'malformed payload' }, { status: 400 });
  }

  // 3. Form must match the configured form.
  if (formID !== JOTFORM_FORM_ID) {
    return NextResponse.json({ error: 'unexpected formID' }, { status: 403 });
  }

  // 4. Map to a candidate and ingest (dedups, derives location, sends Email 1).
  const intake = parseCandidateFromRawRequest(raw, submissionId);
  if (!intake) {
    return NextResponse.json({ error: 'missing email' }, { status: 400 });
  }

  try {
    const { candidate, isNew } = await ingestCandidate(intake);
    return NextResponse.json({ ok: true, candidateId: candidate.id, isNew });
  } catch (err) {
    // 5xx so Jotform retries a transient failure.
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'ingest failed', detail: message }, { status: 500 });
  }
}
