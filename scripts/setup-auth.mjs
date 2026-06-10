// Provision Supabase Auth logins for the team (Step 9).
//
// For every hiring_managers row without a linked auth user, this creates an
// email/password account (email pre-confirmed), links it via auth_user_id, and
// prints the generated password once. Idempotent — already-linked rows are
// skipped. Re-run it after adding new hiring_managers rows.
//
//   node scripts/setup-auth.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const genPassword = () => randomBytes(12).toString('base64url');

const { data: managers, error } = await sb
  .from('hiring_managers')
  .select('id,name,email,role,auth_user_id')
  .order('role');
if (error) throw error;

const created = [];
for (const hm of managers) {
  if (hm.auth_user_id) {
    console.log(`• ${hm.email} — already linked, skipped`);
    continue;
  }
  const password = genPassword();
  const { data, error: cErr } = await sb.auth.admin.createUser({
    email: hm.email,
    password,
    email_confirm: true,
  });
  if (cErr) {
    console.log(`✗ ${hm.email} — ${cErr.message}`);
    continue;
  }
  const { error: uErr } = await sb
    .from('hiring_managers')
    .update({ auth_user_id: data.user.id })
    .eq('id', hm.id);
  if (uErr) {
    console.log(`✗ ${hm.email} — created auth user but link failed: ${uErr.message}`);
    continue;
  }
  created.push({ email: hm.email, role: hm.role, password });
  console.log(`✓ ${hm.email} (${hm.role}) — linked`);
}

if (created.length) {
  console.log('\n=== New credentials (save these now; change after first login) ===');
  for (const c of created) console.log(`  ${c.email}  [${c.role}]  →  ${c.password}`);
} else {
  console.log('\nNo new accounts created.');
}
