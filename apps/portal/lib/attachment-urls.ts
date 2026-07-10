// Server-only download-URL minting. Rows come from the row-scoped
// client_solicitud_attachments view (so ownership is already proven); the
// admin client then signs their private-bucket paths — same signed-URL
// pattern as the Hub's resume downloads.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { ATTACHMENTS_BUCKET } from '@/lib/attachments';
import type { ClientAttachment } from '@/lib/queries';

export type AttachmentWithUrl = ClientAttachment & { url: string | null };

/** Short-lived signed download URLs for the client's own attachments. */
export async function withSignedUrls(
  attachments: ClientAttachment[],
  expiresIn = 3600
): Promise<AttachmentWithUrl[]> {
  if (attachments.length === 0) return [];
  const { data, error } = await createAdminClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUrls(
      attachments.map((a) => a.storage_path),
      expiresIn
    );
  if (error) throw error;
  return attachments.map((a, i) => ({ ...a, url: data?.[i]?.signedUrl ?? null }));
}
