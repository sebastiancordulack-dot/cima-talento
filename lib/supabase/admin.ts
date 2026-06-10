// Admin Supabase client (service-role key, BYPASSES RLS).
// Server-only. Use for the form-intake webhook, automated email logging, and
// status transitions that run without a user session. Never import into client
// code — the service-role key must never reach the browser.
import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
