// Portal reads — ALL through the client_* views with the session client, so
// the security-definer views (migration 0007 §10) do the row scoping and
// column stripping. The portal never touches base tables for reads.
import 'server-only';
import { createClient } from '@cima/db/server';
import { ACTIVE_STATUSES } from '@/lib/status';
import type { Database, SolicitudStatus } from '@cima/db';

export type ClientSolicitud = Database['public']['Views']['client_solicitudes']['Row'];
export type ClientChange = Database['public']['Views']['client_solicitud_changes']['Row'];
export type ClientStatusLog = Database['public']['Views']['client_solicitud_status_log']['Row'];
export type ClientAttachment = Database['public']['Views']['client_solicitud_attachments']['Row'];

/** Active requests for the dashboard, newest first (Brief §13.1). */
export async function listActiveSolicitudes(): Promise<ClientSolicitud[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('client_solicitudes')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Full history, optionally filtered by status (Brief §13.3). */
export async function listAllSolicitudes(status?: SolicitudStatus): Promise<ClientSolicitud[]> {
  const supabase = createClient();
  let query = supabase
    .from('client_solicitudes')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export interface ClientSolicitudDetail {
  solicitud: ClientSolicitud;
  /** Other locations in the same batch submission. */
  siblings: ClientSolicitud[];
  changes: ClientChange[];
  log: ClientStatusLog[];
  attachments: ClientAttachment[];
}

export async function getClientSolicitud(id: string): Promise<ClientSolicitudDetail | null> {
  const supabase = createClient();
  const { data: solicitud, error } = await supabase
    .from('client_solicitudes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!solicitud) return null;

  const [siblingsRes, changesRes, logRes] = await Promise.all([
    solicitud.batch_id
      ? supabase
          .from('client_solicitudes')
          .select('*')
          .eq('batch_id', solicitud.batch_id)
          .neq('id', solicitud.id)
          .order('store_name')
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('client_solicitud_changes')
      .select('*')
      .eq('solicitud_id', solicitud.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('client_solicitud_status_log')
      .select('*')
      .eq('solicitud_id', solicitud.id)
      .order('changed_at', { ascending: true }),
  ]);
  for (const res of [siblingsRes, changesRes, logRes]) {
    if (res.error) throw res.error;
  }
  const siblings = (siblingsRes.data ?? []) as ClientSolicitud[];

  // Files are submission-level: a batch shares them, so every location's page
  // shows the same list (uploads from the form land on the primary row).
  const { data: attachments, error: attachmentsErr } = await supabase
    .from('client_solicitud_attachments')
    .select('*')
    .in('solicitud_id', [solicitud.id, ...siblings.map((sib) => sib.id)])
    .order('created_at', { ascending: true });
  if (attachmentsErr) throw attachmentsErr;

  return {
    solicitud,
    siblings,
    changes: changesRes.data ?? [],
    log: logRes.data ?? [],
    attachments: attachments ?? [],
  };
}
