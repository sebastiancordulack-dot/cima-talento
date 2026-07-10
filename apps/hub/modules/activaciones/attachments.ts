// Client-uploaded solicitud files (migration 0009), for the Hub workspace.
// Rows are read with the session client so staff RLS does the gating; the
// signed download URLs need the service-role client (private bucket, no
// storage policies) — same pattern as Talento's resume downloads.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { createClient } from '@cima/db/server';
import type { Database } from '@cima/db';

const ATTACHMENTS_BUCKET = 'solicitud-attachments';

export type SolicitudAttachment = Database['public']['Tables']['solicitud_attachments']['Row'];
export type AttachmentWithUrl = SolicitudAttachment & { url: string | null };

export async function listAttachmentsWithUrls(
  solicitudId: string,
  expiresIn = 3600
): Promise<AttachmentWithUrl[]> {
  const { data, error } = await createClient()
    .from('solicitud_attachments')
    .select('*')
    .eq('solicitud_id', solicitudId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: signed, error: signErr } = await createAdminClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      expiresIn
    );
  if (signErr) throw signErr;
  return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? null }));
}

/** Human-readable size ("824 KB", "2.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
