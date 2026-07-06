// Resend client — server-only, shared by both apps.
import 'server-only';
import { Resend } from 'resend';

let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not set');
    client = new Resend(apiKey);
  }
  return client;
}

/** Tolerate a value pasted into an env UI with surrounding quotes or stray
 *  whitespace (a common cause of Resend "Invalid `from` field" errors). */
export function cleanFromEmail(raw: string | undefined, fallback: string): string {
  const cleaned = raw?.trim().replace(/^["']|["']$/g, '');
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}
