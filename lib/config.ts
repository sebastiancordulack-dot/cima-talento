// App base URL for absolute links in emails (e.g. the resume upload page).
// Configure NEXT_PUBLIC_SITE_URL in production; falls back to the Vercel domain.
export function appUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  return u && u.length > 0 ? u : 'https://cima-talento.vercel.app';
}
