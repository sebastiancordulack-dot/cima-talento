// Solicitudes queue data access (Activaciones Brief §12).
//
// Reads use the service-role client gated by login (middleware + layout),
// matching lib/talent/queries.ts: every staff member sees every Solicitud
// (Brief §10 — no metro scoping in Activaciones), and the embedded reviewer
// name would otherwise be nulled out by hiring_managers' self-only RLS.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { QUEUE_TABS, type QueueTab } from '@/modules/activaciones/status';
import type { Database } from '@cima/db';

export type Solicitud = Database['public']['Tables']['solicitudes']['Row'];

export interface SolicitudListRow extends Solicitud {
  brand_clients: { company_name: string } | null;
  reviewer: { name: string } | null;
}

const LIST_SELECT = '*, brand_clients(company_name), reviewer:hiring_managers(name)';

/** Solicitudes for a queue tab. Nuevas/revisión/cliente surface the oldest
 *  first (longest waiting on top — Brief §12.1); confirmadas by soonest
 *  activation date; historial most recent first. */
export async function listSolicitudesForTab(tab: QueueTab): Promise<SolicitudListRow[]> {
  const supabase = createAdminClient();
  let query = supabase.from('solicitudes').select(LIST_SELECT).in('status', QUEUE_TABS[tab].statuses);

  if (tab === 'confirmadas') {
    query = query
      .order('date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
  } else if (tab === 'historial') {
    query = query.order('updated_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as SolicitudListRow[];
}

/** Per-tab counts for the queue tab badges. Tabs overlap by design
 *  ("cliente" ⊂ "revision"), so counts are computed per tab, not per status. */
export async function queueCounts(): Promise<Record<QueueTab, number>> {
  const supabase = createAdminClient();
  const entries = await Promise.all(
    (Object.keys(QUEUE_TABS) as QueueTab[]).map(async (tab) => {
      const { count, error } = await supabase
        .from('solicitudes')
        .select('*', { count: 'exact', head: true })
        .in('status', QUEUE_TABS[tab].statuses);
      if (error) throw error;
      return [tab, count ?? 0] as const;
    })
  );
  return Object.fromEntries(entries) as Record<QueueTab, number>;
}

/** Single Solicitud with client + reviewer, for the detail view. */
export async function getSolicitud(id: string): Promise<SolicitudListRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('solicitudes')
    .select(LIST_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SolicitudListRow) ?? null;
}
