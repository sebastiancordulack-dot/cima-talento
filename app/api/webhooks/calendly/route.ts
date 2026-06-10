// Calendly webhook → auto-update candidate status when a call is booked or
// canceled (Brief §11). Endpoint: POST /api/webhooks/calendly
//
// Authenticated by Calendly's HMAC signature (signing key returned when the
// webhook subscription is created). The raw body is required for the signature,
// so we read text() and parse only after verifying.
import { NextResponse } from 'next/server';
import { verifyCalendlySignature, applyCalendlyEvent, type CalendlyEvent } from '@/lib/webhooks/calendly';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rawBody = await req.text();

  const signature = req.headers.get('calendly-webhook-signature');
  if (!verifyCalendlySignature(rawBody, signature, process.env.CALENDLY_WEBHOOK_SIGNING_KEY)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let evt: CalendlyEvent;
  try {
    evt = JSON.parse(rawBody) as CalendlyEvent;
  } catch {
    return NextResponse.json({ error: 'malformed payload' }, { status: 400 });
  }

  try {
    const result = await applyCalendlyEvent(evt);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'processing failed', detail: message }, { status: 500 });
  }
}
