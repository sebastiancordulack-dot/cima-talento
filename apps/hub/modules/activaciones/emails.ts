// The eight Activaciones transactional emails (Brief §11). Nudges only —
// short, clear, always linking back into the app; conversations never happen
// over email (§2). Client-facing copy is English (§3B — brand marketing
// professionals); internal copy is Spanish. All render through the shared
// CiMA-branded shell from lib/email/templates.
import 'server-only';
import { appUrl } from '@/lib/config';
import { renderBrandedEmail, type RenderedEmail } from '@/lib/email/templates';
import { parseDateRange } from '@/modules/activaciones/dates';
import { formatMoney } from '@/modules/activaciones/quote';
import type { ActivacionesEmailType, Database } from '@cima/db';

type Solicitud = Database['public']['Tables']['solicitudes']['Row'];

// Sender identity (Brief §1): CiMA Activaciones <activaciones@cimasales.com>.
// Same quote/whitespace tolerance as lib/email/resend.ts FROM_EMAIL.
const rawFrom = process.env.RESEND_ACTIVACIONES_FROM_EMAIL?.trim().replace(/^["']|["']$/g, '');
export const ACTIVACIONES_FROM_EMAIL =
  rawFrom && rawFrom.length > 0 ? rawFrom : 'CiMA Activaciones <activaciones@cimasales.com>';

/** Client Portal base URL for client-facing CTAs. Set NEXT_PUBLIC_PORTAL_URL
 *  until portal.cimasales.com exists (e.g. the portal's *.vercel.app URL). */
export function portalUrl(): string {
  const u = process.env.NEXT_PUBLIC_PORTAL_URL?.trim().replace(/\/+$/, '');
  return u && u.length > 0 ? u : 'https://portal.cimasales.com';
}

const SIGNATURE_EN = '— CiMA Activaciones\nCiMA Sales | cimasales.com';
const SIGNATURE_ES = '— CiMA Activaciones\nCiMA Sales | cimasales.com';

// ---- Display helpers -----------------------------------------------------------

const EN_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function dateEn(date: string | null): string {
  if (!date) return 'TBD';
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? 'TBD' : EN_DATE.format(d);
}

/** "Jul 18, 2026" or "Jul 25 – Jul 26, 2026" — English, calendar-safe. */
function datesEn(s: Solicitud): string {
  if (s.activation_type === 'in_store') return dateEn(s.date);
  const span = parseDateRange(s.event_dates);
  if (!span) return 'TBD';
  return span.start === span.end ? dateEn(span.start) : `${dateEn(span.start)} – ${dateEn(span.end)}`;
}

function time(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}

/** "Raptor Energy at Fiesta Mart #23" — the request in one phrase. */
function label(s: Solicitud): string {
  const place = s.activation_type === 'in_store' ? s.store_name : s.event_name;
  return place ? `${s.brand} at ${place}` : s.brand;
}

// ---- Client-facing templates (English) -------------------------------------------

export interface ClientEmailContext {
  contactName: string | null;
  /** Locations in the submission (batch size; 1 for single/field event). */
  batchCount: number;
}

function greet(ctx: ClientEmailContext): string {
  return ctx.contactName ? `Hi ${ctx.contactName},` : 'Hi,';
}

function solicitudReceived(s: Solicitud, ctx: ClientEmailContext): RenderedEmail {
  const scope =
    ctx.batchCount > 1 ? `${label(s)} (${ctx.batchCount} locations) on ${datesEn(s)}` : `${label(s)} on ${datesEn(s)}`;
  return renderBrandedEmail(
    'We received your activation request',
    `${greet(ctx)}

Thanks for your request — ${scope} is now with our team. We'll review it and get back to you within 2 business days.

You can follow its status anytime in your portal:

{{cta:View my request|${portalUrl()}}}

${SIGNATURE_EN}`,
    'en'
  );
}

function changeProposed(s: Solicitud, ctx: ClientEmailContext): RenderedEmail {
  return renderBrandedEmail(
    'Action needed: proposed change to your activation',
    `${greet(ctx)}

Our team has proposed a change to your request for ${label(s)}. Please log in to review it and approve or decline — it only takes a minute.

{{cta:Review the proposed change|${portalUrl()}}}

${SIGNATURE_EN}`,
    'en'
  );
}

function quoteSent(s: Solicitud, ctx: ClientEmailContext): RenderedEmail {
  const amount = s.quote_amount != null ? ` (${formatMoney(s.quote_amount)})` : '';
  return renderBrandedEmail(
    'Your quote is ready',
    `${greet(ctx)}

Your quote for ${label(s)}${amount} is ready. Log in to review the breakdown and confirm your activation.

{{cta:Review my quote|${portalUrl()}}}

${SIGNATURE_EN}`,
    'en'
  );
}

function eventConfirmed(s: Solicitud, ctx: ClientEmailContext): RenderedEmail {
  const where =
    s.activation_type === 'in_store'
      ? [s.store_name, s.store_address].filter(Boolean).join(' — ')
      : [s.event_name, s.event_venue, s.event_address].filter(Boolean).join(' — ');
  const start = time(s.activation_type === 'in_store' ? s.time_start : s.activation_time_start);
  const end = time(s.activation_type === 'in_store' ? s.time_end : s.activation_time_end);
  const when = `${datesEn(s)}${start && end ? `, ${start} – ${end}` : ''}`;
  return renderBrandedEmail(
    'Your activation is confirmed',
    `${greet(ctx)}

Great news — your activation is confirmed. Here are the details:

Brand: ${s.brand}
Where: ${where}
When: ${when}

Our team will take it from here. You can review everything in your portal:

{{cta:View my activation|${portalUrl()}}}

${SIGNATURE_EN}`,
    'en'
  );
}

function eventCancelled(s: Solicitud, ctx: ClientEmailContext): RenderedEmail {
  // One template type covers both terminal outcomes (§11 defines a single
  // cancellation email): copy adapts to who/why via the status.
  const line =
    s.status === 'rejected'
      ? `After reviewing your request for ${label(s)}, we're unable to move forward with it this time.`
      : `Your activation request for ${label(s)} has been cancelled.`;
  return renderBrandedEmail(
    'Update on your activation request',
    `${greet(ctx)}

${line} Log in for the details — and don't hesitate to submit a new request anytime.

{{cta:View details|${portalUrl()}}}

${SIGNATURE_EN}`,
    'en'
  );
}

// ---- Internal templates (Spanish) ---------------------------------------------------

export interface InternalEmailContext {
  companyName: string | null;
  batchCount: number;
}

function hubLink(s: Solicitud): string {
  return `${appUrl()}/activaciones/solicitudes/${s.id}`;
}

function internalNewSolicitud(s: Solicitud, ctx: InternalEmailContext): RenderedEmail {
  const scope = ctx.batchCount > 1 ? ` (${ctx.batchCount} ubicaciones)` : '';
  return renderBrandedEmail(
    `Nueva solicitud de ${ctx.companyName ?? s.brand}`,
    `Hay una nueva solicitud de activación: ${label(s)}${scope}, fecha ${datesEn(s)}.

Entra a CiMA Hub para revisarla y comenzar el proceso.

{{cta:Revisar solicitud|${hubLink(s)}}}

${SIGNATURE_ES}`
  );
}

function internalClientApproved(s: Solicitud, ctx: InternalEmailContext): RenderedEmail {
  return renderBrandedEmail(
    `${ctx.companyName ?? s.brand} aprobó — confirma el evento`,
    `El cliente aprobó ${label(s)}.

Entra a CiMA Hub para confirmar el evento y dejarlo en firme.

{{cta:Confirmar evento|${hubLink(s)}}}

${SIGNATURE_ES}`
  );
}

function internalChangeRejected(s: Solicitud, ctx: InternalEmailContext): RenderedEmail {
  return renderBrandedEmail(
    `${ctx.companyName ?? s.brand} rechazó el cambio propuesto`,
    `El cliente rechazó el cambio propuesto para ${label(s)}. La solicitud volvió a revisión.

Entra a CiMA Hub para dar seguimiento.

{{cta:Ver solicitud|${hubLink(s)}}}

${SIGNATURE_ES}`
  );
}

// ---- Registry ------------------------------------------------------------------------

export function renderActivacionesEmail(
  type: ActivacionesEmailType,
  solicitud: Solicitud,
  ctx: ClientEmailContext & InternalEmailContext
): RenderedEmail {
  switch (type) {
    case 'solicitud_received':
      return solicitudReceived(solicitud, ctx);
    case 'change_proposed':
      return changeProposed(solicitud, ctx);
    case 'quote_sent':
      return quoteSent(solicitud, ctx);
    case 'event_confirmed':
      return eventConfirmed(solicitud, ctx);
    case 'event_cancelled':
      return eventCancelled(solicitud, ctx);
    case 'internal_new_solicitud':
      return internalNewSolicitud(solicitud, ctx);
    case 'internal_client_approved':
      return internalClientApproved(solicitud, ctx);
    case 'internal_change_rejected':
      return internalChangeRejected(solicitud, ctx);
  }
}
