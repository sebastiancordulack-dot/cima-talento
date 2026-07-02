// App base URL for absolute links in emails (e.g. the resume upload page).
// Defaults to the custom domain; override with NEXT_PUBLIC_SITE_URL if needed.
export function appUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  return u && u.length > 0 ? u : 'https://talento.cimasales.com';
}
