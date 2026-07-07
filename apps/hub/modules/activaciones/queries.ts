// Solicitudes queue data access (Activaciones Brief §12).
//
// Reads use the service-role client gated by login (middleware + layout),
// matching lib/talent/queries.ts: every staff member sees every Solicitud
// (Brief §10 — no metro scoping in Activaciones), and the embedded reviewer
// name would otherwise be nulled out by hiring_managers' self-only RLS.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { normalizeText } from '@/lib/location/metro-data';
import { getMetroLookups } from '@/lib/location/metros-store';
import { QUEUE_TABS, type QueueTab } from '@/modules/activaciones/status';
import type { Availability, Database } from '@cima/db';

export type Solicitud = Database['public']['Tables']['solicitudes']['Row'];

export interface SolicitudListRow extends Solicitud {
  brand_clients: { company_name: string } | null;
  reviewer: { name: string } | null;
}

const LIST_SELECT = '*, brand_clients(company_name), reviewer:hiring_managers(name)';

export interface QueueFilters {
  tab: QueueTab;
  /** Free-text search over brand / store / event. Searching looks across ALL
   *  statuses — a request must be findable no matter which tab it moved to. */
  q?: string;
  clientId?: string;
}

/** Strip characters that would break the PostgREST or() filter syntax. */
function sanitizeSearch(q: string): string {
  return q.replace(/[,()%\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Solicitudes for the queue. Without a search: tab-scoped, oldest-waiting
 *  first (Brief §12.1), confirmadas by soonest date, historial most recent.
 *  With a search: cross-status, newest first. */
export async function listSolicitudes(filters: QueueFilters): Promise<SolicitudListRow[]> {
  const supabase = createAdminClient();
  let query = supabase.from('solicitudes').select(LIST_SELECT);

  const q = filters.q ? sanitizeSearch(filters.q) : '';
  if (q) {
    query = query
      .or(`brand.ilike.%${q}%,store_name.ilike.%${q}%,event_name.ilike.%${q}%`)
      .order('created_at', { ascending: false });
  } else {
    query = query.in('status', QUEUE_TABS[filters.tab].statuses);
    if (filters.tab === 'confirmadas') {
      query = query
        .order('date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
    } else if (filters.tab === 'historial') {
      query = query.order('updated_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: true });
    }
  }
  if (filters.clientId) query = query.eq('client_id', filters.clientId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as SolicitudListRow[];
}

/** Per-tab counts for the queue tab badges (scoped to the client filter when
 *  one is active). Tabs overlap by design ("cliente" ⊂ "revision"). */
export async function queueCounts(clientId?: string): Promise<Record<QueueTab, number>> {
  const supabase = createAdminClient();
  const entries = await Promise.all(
    (Object.keys(QUEUE_TABS) as QueueTab[]).map(async (tab) => {
      let query = supabase
        .from('solicitudes')
        .select('*', { count: 'exact', head: true })
        .in('status', QUEUE_TABS[tab].statuses);
      if (clientId) query = query.eq('client_id', clientId);
      const { count, error } = await query;
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

// ---- Confirmed events tracker (Brief §12.3) ------------------------------------

export type EventRow = Solicitud & {
  brand_clients: { company_name: string } | null;
  solicitud_assignments: {
    id: string;
    talent: { candidates: { first_name: string; last_name: string | null } } | null;
  }[];
};

/** Confirmed + in-progress events with their assigned talent, soonest first
 *  (field events sort by their range start; rows without a date go last). */
export async function listConfirmedEvents(): Promise<EventRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('solicitudes')
    .select(
      '*, brand_clients(company_name), solicitud_assignments(id, talent:talent_pool(candidates(first_name,last_name)))'
    )
    .in('status', ['confirmed', 'in_progress']);
  if (error) throw error;

  const rows = (data ?? []) as unknown as EventRow[];
  const startOf = (e: EventRow): string =>
    e.activation_type === 'in_store'
      ? (e.date ?? '9999-12-31')
      : (e.event_dates?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '9999-12-31');
  return rows.sort((a, b) => startOf(a).localeCompare(startOf(b)));
}

// ---- Brand clients (Brief §14 "Clientes") --------------------------------------

export type BrandClientRow = Database['public']['Tables']['brand_clients']['Row'] & {
  /** Total Solicitudes ever submitted by this client. */
  solicitud_count: number;
};

export async function listBrandClients(): Promise<BrandClientRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('brand_clients')
    .select('*, solicitudes(count)')
    .order('company_name');
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { solicitudes, ...client } = row as typeof row & {
      solicitudes: { count: number }[];
    };
    return { ...client, solicitud_count: solicitudes?.[0]?.count ?? 0 };
  });
}

// ---- Detail workspace bundle (Brief §12.2) -----------------------------------

export type SolicitudChange = Database['public']['Tables']['solicitud_changes']['Row'];

export type StatusLogEntry = Database['public']['Tables']['solicitud_status_log']['Row'] & {
  /** Resolved actor display name (staff or client company), if attributed. */
  actor_name: string | null;
};

export interface AssignmentRow {
  id: string;
  assigned_at: string;
  notes: string | null;
  talent: {
    id: string;
    metro_area: string | null;
    active: boolean;
    availability: Availability;
    candidates: { first_name: string; last_name: string | null; phone: string | null };
  };
}

export interface TalentOption {
  id: string; // talent_pool.id
  metro_area: string | null;
  availability: Availability;
  candidates: { first_name: string; last_name: string | null };
}

export interface BatchSibling {
  id: string;
  store_name: string | null;
  status: Database['public']['Tables']['solicitudes']['Row']['status'];
}

export interface SolicitudDetail {
  solicitud: SolicitudListRow;
  /** Other locations in the same multi-location batch. */
  siblings: BatchSibling[];
  changes: SolicitudChange[];
  log: StatusLogEntry[];
  assignments: AssignmentRow[];
  /** Active talent pool, suggested-metro members first (Brief §16). */
  talentOptions: TalentOption[];
  /** Metro derived from the store/event address, when recognizable. */
  suggestedMetro: string | null;
}

/** Best-effort metro from a free-text US address: try the ZIP (most reliable),
 *  then known city names. Null when nothing matches — the assignment panel
 *  then simply shows the whole pool unfiltered. */
async function metroForAddress(address: string | null): Promise<string | null> {
  if (!address) return null;
  const { zip3, city } = await getMetroLookups();

  const zips = address.match(/\b(\d{5})(?:-\d{4})?\b/g);
  if (zips) {
    const hit = zip3[zips[zips.length - 1].slice(0, 3)];
    if (hit) return hit.metro;
  }

  const normalized = normalizeText(address);
  for (const [cityName, meta] of Object.entries(city)) {
    if (normalized.includes(cityName)) return meta.metro;
  }
  return null;
}

export async function getSolicitudDetail(id: string): Promise<SolicitudDetail | null> {
  const solicitud = await getSolicitud(id);
  if (!solicitud) return null;

  const supabase = createAdminClient();
  const address =
    solicitud.activation_type === 'in_store' ? solicitud.store_address : solicitud.event_address;

  const [siblingsRes, changesRes, logRes, assignmentsRes, talentRes, suggestedMetro] =
    await Promise.all([
      solicitud.batch_id
        ? supabase
            .from('solicitudes')
            .select('id,store_name,status')
            .eq('batch_id', solicitud.batch_id)
            .neq('id', solicitud.id)
            .order('store_name')
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('solicitud_changes')
        .select('*')
        .eq('solicitud_id', solicitud.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('solicitud_status_log')
        .select('*')
        .eq('solicitud_id', solicitud.id)
        .order('changed_at', { ascending: true }),
      supabase
        .from('solicitud_assignments')
        .select(
          'id,assigned_at,notes,talent:talent_pool(id,metro_area,active,availability,candidates(first_name,last_name,phone))'
        )
        .eq('solicitud_id', solicitud.id)
        .order('assigned_at', { ascending: true }),
      supabase
        .from('talent_pool')
        .select('id,metro_area,availability,candidates(first_name,last_name)')
        .eq('active', true)
        .order('metro_area', { ascending: true, nullsFirst: false }),
      metroForAddress(address),
    ]);

  for (const res of [siblingsRes, changesRes, logRes, assignmentsRes, talentRes]) {
    if (res.error) throw res.error;
  }

  // Resolve status-log actors: changed_by holds a hiring_managers.id or a
  // brand_clients.id depending on actor_type (no FK — Brief §9).
  const logRows = (logRes.data ?? []) as Database['public']['Tables']['solicitud_status_log']['Row'][];
  const staffIds = logRows.filter((l) => l.actor_type !== 'client' && l.changed_by).map((l) => l.changed_by!);
  const clientIds = logRows.filter((l) => l.actor_type === 'client' && l.changed_by).map((l) => l.changed_by!);
  const names = new Map<string, string>();
  if (staffIds.length > 0) {
    const { data } = await supabase.from('hiring_managers').select('id,name').in('id', staffIds);
    for (const r of data ?? []) names.set(r.id, r.name);
  }
  if (clientIds.length > 0) {
    const { data } = await supabase.from('brand_clients').select('id,company_name').in('id', clientIds);
    for (const r of data ?? []) names.set(r.id, r.company_name);
  }
  const log: StatusLogEntry[] = logRows.map((l) => ({
    ...l,
    actor_name: l.changed_by ? (names.get(l.changed_by) ?? null) : null,
  }));

  // Suggested-metro members first, then the rest (alphabetical by metro).
  const options = (talentRes.data ?? []) as unknown as TalentOption[];
  if (suggestedMetro) {
    options.sort((a, b) => {
      const aHit = a.metro_area === suggestedMetro ? 0 : 1;
      const bHit = b.metro_area === suggestedMetro ? 0 : 1;
      return aHit - bHit;
    });
  }

  return {
    solicitud,
    siblings: (siblingsRes.data ?? []) as BatchSibling[],
    changes: (changesRes.data ?? []) as SolicitudChange[],
    log,
    assignments: (assignmentsRes.data ?? []) as unknown as AssignmentRow[],
    talentOptions: options,
    suggestedMetro,
  };
}
