// The five Spanish candidate emails (Brief §7). All candidate-facing copy is in
// Spanish and sent automatically on status changes — never manually.
//
// Each builder returns { subject, html, text }. Copy is kept verbatim from the
// brief; only the dynamic bits ([Nombre], Calendly links) are interpolated.
import type { EmailType } from '@/lib/database.types';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateVars {
  firstName: string;
  /** HM scheduling link — Email 1 only. */
  calendlyHmLink?: string;
  /** Julia scheduling link — Email 3 only. */
  calendlyJuliaLink?: string;
  /** Approx. length of Julia's call, in minutes — Email 3. */
  juliaCallMinutes?: number;
}

const SIGNATURE_CIMA = '— Cima Talento\nCiMA Sales | cimasales.com';
const SIGNATURE_JULIA = '— Julia Magallanes y el equipo de Cima Talento\nCiMA Sales | cimasales.com';

// ---------------------------------------------------------------------------
// HTML rendering — turn the plaintext body into a simple, email-safe layout.
// A line that is exactly a CTA marker `{{cta:LABEL|URL}}` becomes a button.
// ---------------------------------------------------------------------------
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderHtml(body: string): string {
  const blocks = body.trim().split(/\n\n+/).map((block) => {
    const cta = block.match(/^\{\{cta:(.+?)\|(.+?)\}\}$/);
    if (cta) {
      const [, label, url] = cta;
      return `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${escapeHtml(label)}</a></p>`;
    }
    // Preserve single newlines within a paragraph as <br>.
    const html = escapeHtml(block).replace(/\n/g, '<br>');
    return `<p style="margin:16px 0;line-height:1.6;color:#1f2937;">${html}</p>`;
  });

  return `<!doctype html><html lang="es"><body style="margin:0;background:#f8fafc;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
${blocks.join('\n')}
</div></body></html>`;
}

/** Strip CTA markers down to a readable plaintext link line. */
function toText(body: string): string {
  return body.replace(/\{\{cta:(.+?)\|(.+?)\}\}/g, (_m, label, url) => `${label}:\n${url}`).trim();
}

function build(subject: string, body: string): RenderedEmail {
  return { subject, html: renderHtml(body), text: toText(body) };
}

// ---------------------------------------------------------------------------
// Email 1 — Disponibilidad
// ---------------------------------------------------------------------------
function availability(v: TemplateVars): RenderedEmail {
  const link = v.calendlyHmLink ?? '';
  return build(
    'Recibimos tu información — agenda tu llamada aquí',
    `Hola ${v.firstName},

Gracias por tu interés en unirte al equipo de CiMA Sales como Mercaderista. Nos da mucho gusto que hayas dado ese primer paso.

Queremos conocerte. El siguiente paso es una llamada corta de 15 a 20 minutos con uno de nuestros representantes para platicar sobre ti y sobre lo que ofrecemos.

Agenda tu llamada directamente aquí — es rápido y sencillo:

{{cta:Agendar mi llamada|${link}}}

Si tienes alguna pregunta antes de la llamada, responde a este correo y te atendemos con gusto.

¡Esperamos hablar contigo muy pronto!

${SIGNATURE_CIMA}`
  );
}

// ---------------------------------------------------------------------------
// Email 2 — No es un fit (post-HM call)
// ---------------------------------------------------------------------------
function rejectionHm(v: TemplateVars): RenderedEmail {
  return build(
    'Gracias por tu interés en CiMA Sales',
    `Hola ${v.firstName},

Gracias por tomarte el tiempo de conectar con nosotros y conocer más sobre la posición de Mercaderista en CiMA Sales. Apreciamos sinceramente tu interés.

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

// ---------------------------------------------------------------------------
// Email 4 — Bienvenido/a al talent pool
// ---------------------------------------------------------------------------
function welcome(v: TemplateVars): RenderedEmail {
  return build(
    'Bienvenido/a a la Red de Talento de CiMA',
    `Hola ${v.firstName},

Es un placer darte la bienvenida oficial a la Red de Talento de CiMA Sales.

Has sido agregado/a a nuestro equipo de mercaderistas, y ahora formas parte de un grupo que representa algunas de las marcas más emocionantes en el mercado hispano independiente a nivel nacional.

Esto es lo que viene:
• Nuestro equipo se pondrá en contacto contigo pronto con los detalles de tu incorporación.
• Recibirás información sobre tu territorio asignado, tu horario, y cómo configurar la aplicación móvil de CiMA.
• Si tienes preguntas mientras tanto, responde a este correo y te atendemos rápidamente.

En CiMA creemos en una sola cosa: que las personas extraordinarias construyen marcas extraordinarias. Nos alegra que seas parte de eso.

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

export const EMAIL_TEMPLATES: Record<EmailType, (v: TemplateVars) => RenderedEmail> = {
  availability,
  rejection_hm: rejectionHm,
  schedule_julia: scheduleJulia,
  welcome,
  rejection_julia: rejectionJulia,
};

export function renderEmail(type: EmailType, vars: TemplateVars): RenderedEmail {
  return EMAIL_TEMPLATES[type](vars);
}
