// Resend client — server-only. Sends from `talento@cimasales.com` (Brief §1).
// Domain verification for cimasales.com follows the same DNS pattern already
// used for coalhousepizza.com (Brief §14).
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

// Tolerate a value that was pasted into an env UI with surrounding quotes or
// stray whitespace (a common cause of Resend "Invalid `from` field" errors).
const rawFrom = process.env.RESEND_FROM_EMAIL?.trim().replace(/^["']|["']$/g, '');
export const FROM_EMAIL =
  rawFrom && rawFrom.length > 0 ? rawFrom : 'Cima Talento <talento@cimasales.com>';
