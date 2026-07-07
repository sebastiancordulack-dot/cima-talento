// The CiMA-branded email shell shared by every module (Talento's five
// candidate emails, Activaciones' eight §11 nudges): full-width banner header,
// plaintext-paragraph body, {{cta:LABEL|URL}} button markers. Extracted from
// apps/hub/lib/email/templates.ts so both apps render one visual identity.

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Base URL for absolute asset/CTA links (banner image lives on the Talento
 *  domain). Override with NEXT_PUBLIC_SITE_URL. */
export function appUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  return u && u.length > 0 ? u : 'https://talento.cimasales.com';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderHtml(body: string, lang: 'es' | 'en'): string {
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

  // Full-width layout (no floating card): the banner is a full-bleed header,
  // the body fills the field like a normal email. The image is hosted on our
  // domain so clients load it by URL; the filename is versioned because Gmail
  // caches by URL.
  const bannerUrl = `${appUrl()}/email-banner-v2.jpg`;
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<img src="${bannerUrl}" alt="CiMA — Brand Matchmaker" style="display:block;width:100%;height:auto;border:0;">
<div style="padding:24px 28px 32px;">
${blocks.join('\n')}
</div></body></html>`;
}

/** Strip CTA markers down to a readable plaintext link line. */
function toText(body: string): string {
  return body.replace(/\{\{cta:(.+?)\|(.+?)\}\}/g, (_m, label, url) => `${label}:\n${url}`).trim();
}

export function renderBrandedEmail(
  subject: string,
  body: string,
  lang: 'es' | 'en' = 'es'
): RenderedEmail {
  return { subject, html: renderHtml(body, lang), text: toText(body) };
}
