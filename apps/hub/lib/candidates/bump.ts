// Tier-1 "click-to-WhatsApp" bump helpers. Pure + shared (no 'server-only'):
// the button is a client component that builds the wa.me deep link in the
// browser. The actual message is sent from the user's own WhatsApp — we only
// pre-fill it. The copy mirrors the manual bump text approved by the team.
import { appUrl } from '@/lib/config';

/**
 * Normalize a stored phone to the digits-only, country-coded form wa.me needs
 * (no '+', spaces, or punctuation). A bare 10-digit US number gets a leading 1;
 * a number that already carries a country code is kept as-is. Returns null when
 * there aren't enough digits to be a real number, so the UI can disable.
 */
export function normalizePhoneForWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Already internationally formatted ('+' or '00' prefix) → it carries its own
  // country code; keep it verbatim. Never inject a US '1' here (that would
  // misroute e.g. a Cuban +53 number).
  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    const digits = trimmed.replace(/^00/, '').replace(/\D/g, '');
    return digits.length >= 8 ? digits : null;
  }

  // No country code given → only safe to assume US/Canada.
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return '1' + digits; // bare US 10-digit → +1
  if (digits.length === 11 && digits.startsWith('1')) return digits; // US with 1
  return null; // ambiguous without a country code — disable the button
}

/** The candidate's resume-upload + scheduling link (same one used in Email 1). */
export function uploadLinkFor(uploadToken: string): string {
  return `${appUrl()}/cv/${uploadToken}`;
}

/** The professional Spanish bump message, name + link interpolated. */
export function buildBumpMessage(firstName: string, uploadUrl: string): string {
  return (
    `Hola ${firstName}, te saluda el equipo de CiMA Sales. Gracias por tu interés en ` +
    `la posición de Mercaderista. Para continuar con el proceso, te invitamos a subir ` +
    `tu currículum y agendar tu llamada en el siguiente enlace (toma menos de un minuto): ` +
    `${uploadUrl}. Quedamos atentos y será un gusto hablar contigo pronto. — Equipo CiMA Sales`
  );
}

/**
 * Build the wa.me deep link that opens WhatsApp with the bump pre-filled.
 * Returns null when the candidate has no usable phone number.
 */
export function buildWhatsappBumpUrl(opts: {
  firstName: string;
  phone: string | null | undefined;
  uploadToken: string;
}): string | null {
  const phone = normalizePhoneForWhatsapp(opts.phone);
  if (!phone) return null;
  const message = buildBumpMessage(opts.firstName, uploadLinkFor(opts.uploadToken));
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
