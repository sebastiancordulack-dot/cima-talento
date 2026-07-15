// Central candidate-email dispatch: render → send via Resend → log to
// email_log. Every automated email in the pipeline goes through here.
//
// Resilient by design: a send failure is recorded in email_log (status
// `failed`) and surfaced in the return value, but does NOT throw — a pipeline
// status change must persist even if the email provider hiccups. Nothing is
// ever sent manually (Brief §7, §14).
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { renderEmail } from '@/lib/email/templates';
import { resolveHmCalendlyLink, resolveJuliaCalendlyLink } from '@/lib/email/calendly';
import { appUrl } from '@/lib/config';
import type { Database, EmailType, CandidateStatus } from '@cima/db';

type Candidate = Database['public']['Tables']['candidates']['Row'];

export interface SendResult {
  ok: boolean;
  emailType: EmailType;
  resendId: string | null;
  error?: string;
}

/**
 * Map of pipeline statuses to the email that fires when a candidate ENTERS
 * that status (Brief §7 trigger map). Statuses absent from the map
 * (`scheduled`, `in_review`, `julia_scheduled`, `no_show`) send nothing.
 */
export const STATUS_EMAIL: Partial<Record<CandidateStatus, EmailType>> = {
  new: 'availability',          // Email 1 — Disponibilidad
  rejected_hm: 'rejection_hm',  // Email 2 — No es un fit
  advanced: 'schedule_julia',   // Email 3 — Agenda con Julia
  approved: 'welcome',          // Email 4 — Bienvenido/a
  rejected_julia: 'rejection_julia', // Email 5 — No avanza
  archived: 'archived',         // Archivo — kept on file for the future
};

// Payments/onboarding contact — the welcome email directs new hires to send
// their payment-setup info here (not a reply to Cima Talento), and Mary is CC'd.
const MARY_EMAIL = 'mary@cimasales.com';

interface EmailExtras {
  cc?: string | string[];
  replyTo?: string | string[];
  attachments?: { filename: string; path: string }[];
}

/** Per-type extras (cc / reply-to / attachments). Only the welcome email needs
 *  them: it attaches the W-9 + filled example (hosted in /public, fetched by
 *  Resend) and routes replies + a copy to Mary for payment onboarding. */
function emailExtras(type: EmailType): EmailExtras {
  if (type === 'welcome') {
    return {
      cc: MARY_EMAIL,
      replyTo: MARY_EMAIL,
      attachments: [
        { filename: 'W-9 (formulario en blanco).pdf', path: `${appUrl()}/cima-w9.pdf` },
        { filename: 'W-9 (ejemplo de llenado).png', path: `${appUrl()}/cima-w9-ejemplo.png` },
      ],
    };
  }
  return {};
}

/** Render the dynamic vars an email type needs for a given candidate. */
async function buildVars(type: EmailType, candidate: Candidate) {
  const base = { firstName: candidate.first_name, role: candidate.role };
  if (type === 'availability') {
    // Promotores/as schedule directly (no CV gate); everyone else goes through
    // the upload page, which reveals the same Calendly link after the upload.
    if (candidate.role === 'promotor') {
      return { ...base, calendlyHmLink: await resolveHmCalendlyLink(candidate.metro_area) };
    }
    return { ...base, uploadUrl: `${appUrl()}/cv/${candidate.upload_token}` };
  }
  if (type === 'schedule_julia') {
    return { ...base, calendlyJuliaLink: resolveJuliaCalendlyLink() };
  }
  return base;
}

/** Send a specific email to a candidate and record it in email_log. */
export async function sendCandidateEmail(
  candidate: Candidate,
  type: EmailType
): Promise<SendResult> {
  const supabase = createAdminClient();
  const vars = await buildVars(type, candidate);
  const { subject, html, text } = renderEmail(type, vars);
  const extras = emailExtras(type);

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: candidate.email,
      subject,
      html,
      text,
      ...(extras.cc ? { cc: extras.cc } : {}),
      ...(extras.replyTo ? { replyTo: extras.replyTo } : {}),
      ...(extras.attachments ? { attachments: extras.attachments } : {}),
    });
    if (error) throw new Error(error.message);

    await supabase.from('email_log').insert({
      candidate_id: candidate.id,
      email_type: type,
      resend_id: data?.id ?? null,
      status: 'sent',
    });
    return { ok: true, emailType: type, resendId: data?.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('email_log').insert({
      candidate_id: candidate.id,
      email_type: type,
      status: 'failed',
      error_message: message,
    });
    return { ok: false, emailType: type, resendId: null, error: message };
  }
}

/**
 * Send whichever email (if any) corresponds to the candidate's CURRENT status.
 * Called by status-transition logic (webhook for `new`, dashboard for HM/Julia
 * decisions). No-op for statuses that don't trigger an email.
 */
export async function sendStatusEmail(candidate: Candidate): Promise<SendResult | null> {
  const type = STATUS_EMAIL[candidate.status];
  if (!type) return null;
  return sendCandidateEmail(candidate, type);
}
