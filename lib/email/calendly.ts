// Resolves which Calendly link to inject into an email (Brief §11).
//
//   • Email 1 → the hiring manager who covers the candidate's metro; falls
//     back to the default CiMA scheduling link (CALENDLY_HM_LINK) when no metro
//     is mapped yet or no HM owns it.
//   • Email 3 → Julia's fixed scheduling link (see JULIA_LINK below).
//
// Full Calendly webhook auto-status-updates are Step 8; this only handles link
// injection.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_HM_LINK = process.env.CALENDLY_HM_LINK ?? '';
// Julia's scheduling link — a single fixed Calendly event (Email 3).
const JULIA_LINK = 'https://calendly.com/julia-cimasales/cima-talento-llamada-con-julia';

/** Hiring-manager scheduling link for a candidate's metro, with fallback. */
export async function resolveHmCalendlyLink(metroArea: string | null): Promise<string> {
  if (metroArea) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('hiring_managers')
      .select('calendly_link')
      .eq('role', 'hiring_manager')
      .eq('active', true)
      .contains('assigned_metros', [metroArea])
      .not('calendly_link', 'is', null)
      .limit(1)
      .maybeSingle();

    if (data?.calendly_link) return data.calendly_link;
  }
  return DEFAULT_HM_LINK;
}

/** Julia's scheduling link. */
export function resolveJuliaCalendlyLink(): string {
  return JULIA_LINK;
}
