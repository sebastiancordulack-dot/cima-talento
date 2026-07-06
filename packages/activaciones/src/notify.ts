// Activaciones transactional-email dispatch (Brief §11): render → send via
// Resend → log to activaciones_email_log. Called from the transition engine
// and (submission emails) the portal's submit action.
//
// Resilient by design, same contract as Talento's lib/email/send.ts: a send
// failure is recorded (status `failed`) but NEVER throws — a status change
// must persist even if the email provider hiccups.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { getResend } from '@cima/email/resend';
import {
  ACTIVACIONES_FROM_EMAIL,
  renderActivacionesEmail,
} from './emails';
import type { ActivacionesEmailType, Database, SolicitudActor, SolicitudStatus } from '@cima/db';

type Solicitud = Database['public']['Tables']['solicitudes']['Row'];

export interface NotifyContext {
  /** Status the Solicitud came from (drives the reopen → change-rejected case). */
  from?: SolicitudStatus | null;
  /** Who drove the transition — client actions trigger internal nudges. */
  actorType?: SolicitudActor;
  /** Skip emails for this row (batch operations notify once, not per row). */
  suppress?: boolean;
}

const INTERNAL_TYPES: ReadonlySet<ActivacionesEmailType> = new Set<ActivacionesEmailType>([
  'internal_new_solicitud',
  'internal_client_approved',
  'internal_change_rejected',
]);

/** Emails triggered when a Solicitud ENTERS a status (§11 trigger map).
 *  submitted is handled by sendSolicitudSubmittedEmails (fires on INSERT, not
 *  on a transition). in_review normally sends nothing — except when the
 *  CLIENT bounced it back by rejecting a proposed change. */
function emailsFor(to: SolicitudStatus, ctx: NotifyContext): ActivacionesEmailType[] {
  switch (to) {
    case 'changes_proposed':
      return ['change_proposed'];
    case 'quote_sent':
      return ['quote_sent'];
    case 'confirmed':
      return ['event_confirmed'];
    case 'cancelled':
    case 'rejected':
      return ['event_cancelled'];
    case 'client_approved':
      return ['internal_client_approved'];
    case 'in_review':
      return ctx.from === 'changes_proposed' && ctx.actorType === 'client'
        ? ['internal_change_rejected']
        : [];
    default:
      return [];
  }
}

/** Internal nudge recipients: ACTIVACIONES_INTERNAL_EMAILS (comma-separated)
 *  or, unset, every active admin/Julia account — so the team inbox works with
 *  zero config and can be overridden later. */
async function internalRecipients(): Promise<string[]> {
  const configured = (process.env.ACTIVACIONES_INTERNAL_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;

  const { data } = await createAdminClient()
    .from('hiring_managers')
    .select('email')
    .in('role', ['admin', 'julia'])
    .eq('active', true);
  return (data ?? []).map((r) => r.email);
}

interface EmailJob {
  type: ActivacionesEmailType;
  to: string[];
  contactName: string | null;
  companyName: string | null;
  batchCount: number;
}

async function buildJob(
  solicitud: Solicitud,
  type: ActivacionesEmailType,
  batchCount: number
): Promise<EmailJob | null> {
  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from('brand_clients')
    .select('portal_email,contact_name,company_name')
    .eq('id', solicitud.client_id)
    .maybeSingle();

  if (INTERNAL_TYPES.has(type)) {
    const to = await internalRecipients();
    if (to.length === 0) return null; // nobody to notify — skip silently
    return { type, to, contactName: null, companyName: client?.company_name ?? null, batchCount };
  }

  if (!client?.portal_email) return null;
  return {
    type,
    to: [client.portal_email],
    contactName: client.contact_name ?? null,
    companyName: client.company_name ?? null,
    batchCount,
  };
}

/** Send one email and log it. Never throws. */
async function sendAndLog(solicitud: Solicitud, job: EmailJob): Promise<void> {
  const supabase = createAdminClient();
  const rendered = renderActivacionesEmail(job.type, solicitud, {
    contactName: job.contactName,
    companyName: job.companyName,
    batchCount: job.batchCount,
  });

  try {
    const { data, error } = await getResend().emails.send({
      from: ACTIVACIONES_FROM_EMAIL,
      to: job.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (error) throw new Error(error.message);

    await supabase.from('activaciones_email_log').insert({
      solicitud_id: solicitud.id,
      email_type: job.type,
      recipient_email: job.to.join(', '),
      resend_id: data?.id ?? null,
      status: 'sent',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from('activaciones_email_log')
      .insert({
        solicitud_id: solicitud.id,
        email_type: job.type,
        recipient_email: job.to.join(', '),
        status: 'failed',
        error_message: message,
      })
      .then(undefined, () => {}); // even the failure log must not throw
    console.error(`[activaciones/notify] ${job.type} failed:`, message);
  }
}

/** Status-change hook, called by transitions.ts after every transition. */
export async function notifySolicitudStatus(
  solicitud: Solicitud,
  to: SolicitudStatus,
  ctx: NotifyContext = {}
): Promise<void> {
  if (ctx.suppress) return;
  for (const type of emailsFor(to, ctx)) {
    const job = await buildJob(solicitud, type, 1);
    if (job) await sendAndLog(solicitud, job);
  }
}

/** Submission emails (§11 rows 1 + 6): client confirmation + internal alert.
 *  Fires on INSERT from the portal submit action (Step 6). For multi-location
 *  batches, called ONCE with the primary row and the batch size — one email
 *  covers the whole submission. */
export async function sendSolicitudSubmittedEmails(
  solicitud: Solicitud,
  batchCount: number
): Promise<void> {
  for (const type of ['solicitud_received', 'internal_new_solicitud'] as const) {
    const job = await buildJob(solicitud, type, batchCount);
    if (job) await sendAndLog(solicitud, job);
  }
}
