// Resend client — re-exported from the shared @cima/email package (the
// client factory moved there so the Client Portal sends through the same
// plumbing). Sends from `talento@cimasales.com` (Brief §1).
import 'server-only';
import { cleanFromEmail } from '@cima/email/resend';

export { getResend } from '@cima/email/resend';

export const FROM_EMAIL = cleanFromEmail(
  process.env.RESEND_FROM_EMAIL,
  'Cima Talento <talento@cimasales.com>'
);
