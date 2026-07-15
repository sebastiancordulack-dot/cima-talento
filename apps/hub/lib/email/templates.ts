// The five Spanish candidate emails (Brief §7). All candidate-facing copy is in
// Spanish and sent automatically on status changes — never manually.
//
// Each builder returns { subject, html, text }. Copy is kept verbatim from the
// brief; only the dynamic bits ([Nombre], Calendly links) are interpolated.
import type { CandidateRole, EmailType } from '@cima/db';
import { renderBrandedEmail } from '@cima/email';

export type { RenderedEmail } from '@cima/email';
import type { RenderedEmail } from '@cima/email';

export interface TemplateVars {
  firstName: string;
  /** Merch vs promo — adjusts the position wording; null/absent = neutral copy. */
  role?: CandidateRole | null;
  /** Resume-upload page link — Email 1, mercaderista/unclassified variants. */
  uploadUrl?: string;
  /** HM scheduling link — Email 1, promotor variant (no CV gate). */
  calendlyHmLink?: string;
  /** Julia scheduling link — Email 3 only. */
  calendlyJuliaLink?: string;
  /** Approx. length of Julia's call, in minutes — Email 3. */
  juliaCallMinutes?: number;
}

const SIGNATURE_CIMA = '— Cima Talento\nCiMA Sales | cimasales.com';
const SIGNATURE_JULIA = '— Julia Magallanes y el equipo de Cima Talento\nCiMA Sales | cimasales.com';

// ---------------------------------------------------------------------------
// HTML rendering — the branded shell (banner + CTA buttons) lives in
// @cima/email so both apps share one visual identity.
// ---------------------------------------------------------------------------
function build(subject: string, body: string): RenderedEmail {
  return renderBrandedEmail(subject, body, 'es');
}

// ---------------------------------------------------------------------------
// Email 1 — Disponibilidad
//
// Three variants by role: mercaderista (CV gate, original copy), promotor/a
// (no CV — schedules directly), and unclassified (role-neutral copy, CV gate
// kept since it's the stricter path and never states a wrong position).
// ---------------------------------------------------------------------------
function availability(v: TemplateVars): RenderedEmail {
  if (v.role === 'promotor') {
    const link = v.calendlyHmLink ?? '';
    return build(
      'Recibimos tu información — agenda tu llamada',
      `Hola ${v.firstName},

Gracias por tu interés en unirte al equipo de CiMA Sales como Promotor/a. Nos da mucho gusto que hayas dado ese primer paso.

El siguiente paso es una llamada corta de 15 a 20 minutos con uno de nuestros representantes. Agéndala aquí — toma menos de un minuto:

{{cta:Agendar mi llamada|${link}}}

Si tienes alguna pregunta antes de la llamada, responde a este correo y te atendemos con gusto.

¡Esperamos hablar contigo muy pronto!

${SIGNATURE_CIMA}`
    );
  }

  const link = v.uploadUrl ?? '';
  const interes =
    v.role === 'mercaderista'
      ? 'unirte al equipo de CiMA Sales como Mercaderista'
      : 'unirte al equipo de CiMA Sales';
  return build(
    'Recibimos tu información — sube tu CV y agenda tu llamada',
    `Hola ${v.firstName},

Gracias por tu interés en ${interes}. Nos da mucho gusto que hayas dado ese primer paso.

El siguiente paso es una llamada corta de 15 a 20 minutos con uno de nuestros representantes. Para agendarla, primero sube tu currículum (CV) en el siguiente enlace — toma menos de un minuto, y desde ahí podrás reservar tu llamada:

{{cta:Subir mi CV y agendar|${link}}}

Aceptamos archivos PDF o Word. Si tienes alguna pregunta antes de la llamada, responde a este correo y te atendemos con gusto.

¡Esperamos hablar contigo muy pronto!

${SIGNATURE_CIMA}`
  );
}

/** "la posición de Mercaderista" / "la posición de Promotor/a", or a neutral
 *  phrase when the candidate was never classified. */
function positionPhrase(role: TemplateVars['role']): string {
  if (role === 'mercaderista') return 'la posición de Mercaderista';
  if (role === 'promotor') return 'la posición de Promotor/a';
  return 'las oportunidades';
}

// ---------------------------------------------------------------------------
// Email 2 — No es un fit (post-HM call)
// ---------------------------------------------------------------------------
function rejectionHm(v: TemplateVars): RenderedEmail {
  return build(
    'Gracias por tu interés en CiMA Sales',
    `Hola ${v.firstName},

Gracias por tomarte el tiempo de conectar con nosotros y conocer más sobre ${positionPhrase(v.role)} en CiMA Sales. Apreciamos sinceramente tu interés.

Después de evaluar tu perfil, hemos decidido continuar con otros candidatos cuya experiencia se ajusta mejor a lo que buscamos en este momento.

Esto no es un reflejo de tu potencial — simplemente es una cuestión de fit para esta posición en particular. Te invitamos a estar pendiente de futuras oportunidades en cimasales.com.

Te deseamos mucho éxito en tu búsqueda.

${SIGNATURE_CIMA}`
  );
}

// ---------------------------------------------------------------------------
// Email 3 — Agenda con Julia
// ---------------------------------------------------------------------------
function scheduleJulia(v: TemplateVars): RenderedEmail {
  const link = v.calendlyJuliaLink ?? '';
  const minutes = v.juliaCallMinutes ?? 20;
  return build(
    '¡Vas avanzando! — agenda tu llamada con Julia',
    `Hola ${v.firstName},

Excelentes noticias — después de hablar con nuestro equipo, nos gustaría continuar conociéndote.

El siguiente paso es una llamada breve con Julia Magallanes, Fundadora y CEO de CiMA Sales. Es tu oportunidad de conocer más sobre nuestra visión y para que Julia pueda conocerte mejor.

Agenda tu llamada aquí:

{{cta:Agendar con Julia|${link}}}

La llamada será de aproximadamente ${minutes} minutos. Ven listo/a para hablar sobre ti y lo que te emociona de esta oportunidad.

¡Estamos emocionados de seguir adelante contigo!

${SIGNATURE_CIMA}`
  );
}

/** Team the welcome email adds them to, by role (neutral when unclassified). */
function teamPhrase(role: TemplateVars['role']): string {
  if (role === 'mercaderista') return 'nuestro equipo de mercaderistas';
  if (role === 'promotor') return 'nuestro equipo de promotores/as';
  return 'nuestra Red de Talento';
}

// ---------------------------------------------------------------------------
// Email 4 — Bienvenido/a al talent pool
// ---------------------------------------------------------------------------
function welcome(v: TemplateVars): RenderedEmail {
  return build(
    'Bienvenido/a a la Red de Talento de CiMA',
    `Hola ${v.firstName},

¡Bienvenido/a al equipo de CiMA Sales! Es un placer darte la bienvenida oficial a la Red de Talento.

Has sido agregado/a a ${teamPhrase(v.role)}, y ahora formas parte de un grupo que representa algunas de las marcas más emocionantes en el mercado hispano independiente a nivel nacional.

Para darte de alta en nuestro sistema de pagos, necesitamos que envíes la siguiente información a Mary Badillo (mary@cimasales.com):

1. Nombre completo
2. Dirección de correspondencia
3. Forma W-9 llenada, firmada, fechada y escaneada (solo la Hoja 1). Adjuntamos la forma en blanco y un ejemplo de cómo llenarla.
4. Foto de la tarjeta o documento/carta donde venga tu NSS o ITIN.
5. Foto de tu identificación (ID).
6. Datos bancarios para depósito directo por ACH:
• Nombre del banco
• Número de cuenta
• Número de routing para ACH
• Foto de los datos bancarios (puede ser de la app de tu banco o de un cheque cancelado).

Sobre los pagos: se realizan de forma quincenal mediante depósito directo, los días 15 y 30 ó 31 (o antes si caen en día inhábil). El corte se hace 5 días hábiles antes, por cuestiones del sistema y de procesamiento.

Al ser Contratistas Independientes, en enero de cada año se te hará llegar la forma 1099, donde se indica el monto total de los pagos recibidos de CiMA durante el año anterior; te servirá para identificar tus ingresos al momento de elaborar tu declaración de impuestos personal.

Por favor envía toda esta información directamente a Mary (mary@cimasales.com). Quedamos a tus órdenes para cualquier pregunta.

¡Bienvenido/a al equipo!

${SIGNATURE_JULIA}`
  );
}

// ---------------------------------------------------------------------------
// Email 5 — No avanza (post-Julia call)
// ---------------------------------------------------------------------------
function rejectionJulia(v: TemplateVars): RenderedEmail {
  return build(
    'Seguimiento a tu proceso con CiMA Sales',
    `Hola ${v.firstName},

Gracias por tomarte el tiempo de hablar con Julia y por tu paciencia durante nuestro proceso. Lo valoramos genuinamente.

Después de nuestra evaluación final, hemos decidido continuar en otra dirección para esta posición. Sabemos que no es fácil escuchar esto, y queremos que sepas que tampoco fue una decisión fácil para nosotros — pusiste esfuerzo real en este proceso y eso se notó.

CiMA sigue creciendo y guardaremos tu información. Si surge una nueva oportunidad que sea un buen match para ti, serás de los primeros en saberlo.

Gracias nuevamente por tu interés en CiMA Sales. Te deseamos lo mejor.

${SIGNATURE_CIMA}`
  );
}

// ---------------------------------------------------------------------------
// Email — Archivo (en espera): kept on file for future opportunities
// ---------------------------------------------------------------------------
function archived(v: TemplateVars): RenderedEmail {
  return build(
    'Gracias por tu interés — te mantenemos en nuestro archivo',
    `Hola ${v.firstName},

Gracias por tomarte el tiempo de conocernos y por tu interés en CiMA Sales. Lo valoramos de verdad.

Por ahora no contamos con una posición que se ajuste a tu perfil, pero nos gustó conocerte y queremos mantenerte en nuestro archivo de talento. Si surge una oportunidad que encaje contigo, serás de las primeras personas en saberlo y te contactaremos directamente.

No necesitas hacer nada más por ahora — nosotros nos pondremos en contacto cuando haya una necesidad.

Gracias nuevamente por tu interés. Esperamos seguir en contacto muy pronto.

${SIGNATURE_CIMA}`
  );
}

export const EMAIL_TEMPLATES: Record<EmailType, (v: TemplateVars) => RenderedEmail> = {
  availability,
  rejection_hm: rejectionHm,
  schedule_julia: scheduleJulia,
  welcome,
  rejection_julia: rejectionJulia,
  archived,
};

export function renderEmail(type: EmailType, vars: TemplateVars): RenderedEmail {
  return EMAIL_TEMPLATES[type](vars);
}
