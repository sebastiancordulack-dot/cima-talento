'use server';

// Brand-client provisioning (Activaciones Brief §14 "Clientes" — admin only,
// §10: staff cannot provision accounts). One shared portal login per client
// (§3B): credentials live in Supabase Auth; brand_clients.auth_user_id links
// the account. Passwords are generated here, shown to the admin ONCE, and
// never stored by us.
import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@cima/db/admin';
import { assertAdmin, AuthError } from '@/lib/auth/session';

export interface ClientActionResult {
  ok: boolean;
  error?: string;
  /** Present after create/reset — display once for the admin to hand off. */
  password?: string;
}

function fail(err: unknown): ClientActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  console.error('[activaciones/client-actions]', err);
  return { ok: false, error: 'Algo salió mal. Intenta de nuevo.' };
}

function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/** Readable, unambiguous password (no 0/O/1/l/I): xxxx-xxxx-xxxx, ~69 bits. */
function generatePassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const chars = Array.from(randomBytes(12), (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface BrandClientInput {
  company_name: string;
  /** Brand names, already split (the form splits on commas/newlines). */
  brands: string[];
  portal_email: string;
  contact_name: string;
  contact_phone: string;
}

export async function createBrandClient(input: BrandClientInput): Promise<ClientActionResult> {
  try {
    const admin = await assertAdmin();
    const email = input.portal_email.trim().toLowerCase();
    if (!input.company_name.trim()) return { ok: false, error: 'El nombre de la empresa es obligatorio.' };
    if (!EMAIL_RE.test(email)) return { ok: false, error: 'El correo de acceso no es válido.' };

    const supabase = createAdminClient();
    const password = generatePassword();

    // 1. The shared portal login in Supabase Auth.
    const { data: created, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered')) {
        return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
      }
      throw authError;
    }

    // 2. The brand_clients row. If it fails (e.g. duplicate portal_email),
    // remove the just-created auth user so no orphan login remains.
    const { error: insertError } = await supabase.from('brand_clients').insert({
      company_name: input.company_name.trim(),
      brands: input.brands.map((b) => b.trim()).filter(Boolean),
      portal_email: email,
      contact_name: clean(input.contact_name),
      contact_phone: clean(input.contact_phone),
      auth_user_id: created.user.id,
      created_by: admin.hm!.id,
    });
    if (insertError) {
      await supabase.auth.admin.deleteUser(created.user.id).catch(() => {});
      if (insertError.code === '23505') {
        return { ok: false, error: 'Ya existe un cliente con ese correo de acceso.' };
      }
      throw insertError;
    }

    revalidatePath('/activaciones/clientes');
    return { ok: true, password };
  } catch (err) {
    return fail(err);
  }
}

export async function updateBrandClient(
  clientId: string,
  input: BrandClientInput
): Promise<ClientActionResult> {
  try {
    await assertAdmin();
    const email = input.portal_email.trim().toLowerCase();
    if (!input.company_name.trim()) return { ok: false, error: 'El nombre de la empresa es obligatorio.' };
    if (!EMAIL_RE.test(email)) return { ok: false, error: 'El correo de acceso no es válido.' };

    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from('brand_clients')
      .select('id,portal_email,auth_user_id')
      .eq('id', clientId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return { ok: false, error: 'Cliente no encontrado.' };

    // Keep the Supabase Auth login in sync when the portal email changes.
    if (existing.auth_user_id && email !== existing.portal_email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        existing.auth_user_id,
        { email, email_confirm: true }
      );
      if (authError) {
        if (authError.message.toLowerCase().includes('already')) {
          return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
        }
        throw authError;
      }
    }

    const { error } = await supabase
      .from('brand_clients')
      .update({
        company_name: input.company_name.trim(),
        brands: input.brands.map((b) => b.trim()).filter(Boolean),
        portal_email: email,
        contact_name: clean(input.contact_name),
        contact_phone: clean(input.contact_phone),
      })
      .eq('id', clientId);
    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Ya existe un cliente con ese correo de acceso.' };
      }
      throw error;
    }

    revalidatePath('/activaciones/clientes');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** New password for the shared login — shown once, sent to the client by the
 *  admin (there is no self-service reset in the portal; §3B invite-only). */
export async function resetClientPassword(clientId: string): Promise<ClientActionResult> {
  try {
    await assertAdmin();
    const supabase = createAdminClient();
    const { data: client, error: fetchError } = await supabase
      .from('brand_clients')
      .select('id,auth_user_id')
      .eq('id', clientId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!client?.auth_user_id) {
      return { ok: false, error: 'Este cliente no tiene una cuenta de acceso vinculada.' };
    }

    const password = generatePassword();
    const { error } = await supabase.auth.admin.updateUserById(client.auth_user_id, { password });
    if (error) throw error;

    return { ok: true, password };
  } catch (err) {
    return fail(err);
  }
}

/** Portal access switch. current_brand_client_id() requires active=true, so a
 *  deactivated client can still authenticate but sees no data and is bounced
 *  by requireBrandClient. */
export async function setClientActive(
  clientId: string,
  active: boolean
): Promise<ClientActionResult> {
  try {
    await assertAdmin();
    const { error } = await createAdminClient()
      .from('brand_clients')
      .update({ active })
      .eq('id', clientId);
    if (error) throw error;

    revalidatePath('/activaciones/clientes');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
