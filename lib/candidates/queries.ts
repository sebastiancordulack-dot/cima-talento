// Dashboard data access.
//
// Reads run through the session-scoped server client, so the RLS policies
// enforce visibility (admin/Julia see all; HMs see their assigned metros). The
// query shapes are identical to the unscoped versions — RLS does the filtering.
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { DASHBOARD_TABS, type DashboardTab } from '@/lib/candidates/status';
import type { Database } from '@/lib/database.types';

export type Candidate = Database['public']['Tables']['candidates']['Row'];
export type StatusHistoryRow = Database['public']['Tables']['candidate_status_history']['Row'];
export type EmailLogRow = Database['public']['Tables']['email_log']['Row'];

/** Candidates for a dashboard tab, grouped by metro then by submission date
 *  (Brief §5.1 — sorted by metro area, then submission date). */
export async function listCandidatesForTab(tab: DashboardTab): Promise<Candidate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .in('status', DASHBOARD_TABS[tab].statuses)
    .order('metro_area', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Julia's review queue: candidates awaiting or in her call (Brief §5.2),
 *  ordered by HM score (strongest first) then submission date. */
export async function listJuliaQueue(): Promise<Candidate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .in('status', ['advanced', 'julia_scheduled'])
    .order('score_total', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Per-tab counts for the nav badges. */
export async function tabCounts(): Promise<Record<DashboardTab, number>> {
  const supabase = createClient();
  const entries = await Promise.all(
    (Object.keys(DASHBOARD_TABS) as DashboardTab[]).map(async (tab) => {
      const { count, error } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .in('status', DASHBOARD_TABS[tab].statuses);
      if (error) throw error;
      return [tab, count ?? 0] as const;
    })
  );
  return Object.fromEntries(entries) as Record<DashboardTab, number>;
}

export interface CandidateProfile {
  candidate: Candidate;
  history: StatusHistoryRow[];
  emails: EmailLogRow[];
}

/** Full profile bundle: candidate + status timeline + email log. */
export async function getCandidateProfile(id: string): Promise<CandidateProfile | null> {
  const supabase = createClient();
  const { data: candidate, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!candidate) return null;

  const [{ data: history }, { data: emails }] = await Promise.all([
    supabase
      .from('candidate_status_history')
      .select('*')
      .eq('candidate_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('email_log')
      .select('*')
      .eq('candidate_id', id)
      .order('sent_at', { ascending: false }),
  ]);

  return { candidate, history: history ?? [], emails: emails ?? [] };
}
