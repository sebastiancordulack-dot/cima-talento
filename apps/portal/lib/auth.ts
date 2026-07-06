// Portal auth: the signed-in user must map to an ACTIVE brand_clients row
// (invite-only, one shared login per client — Brief §3B). RLS lets a client
// read exactly their own row, so this runs on the session client.
import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@cima/db/server';
import type { Database } from '@cima/db';

export type BrandClient = Database['public']['Tables']['brand_clients']['Row'];

/** The caller's brand client, or null (not signed in / not a client account). */
export async function getBrandClient(): Promise<BrandClient | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('brand_clients')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle();
  return data ?? null;
}

/** Page guard: redirect to /login unless the caller is an active client. */
export async function requireBrandClient(): Promise<BrandClient> {
  const client = await getBrandClient();
  if (!client) redirect('/login?error=noclient');
  return client;
}

export class PortalAuthError extends Error {}

/** Action guard: throwing variant whose message becomes the action error. */
export async function assertBrandClient(): Promise<BrandClient> {
  const client = await getBrandClient();
  if (!client) throw new PortalAuthError('Your session has expired — please sign in again.');
  return client;
}
