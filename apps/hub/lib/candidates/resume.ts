// Server-only resume read helpers: resolve a candidate from their public upload
// token, and mint a short-lived signed URL for staff to download the file.
import 'server-only';
import { createAdminClient } from '@cima/db/admin';
import { RESUME_BUCKET } from '@/lib/candidates/resume-constants';

export interface UploadCandidate {
  id: string;
  first_name: string;
  metro_area: string | null;
  resume_filename: string | null;
  resume_uploaded_at: string | null;
}

/** Resolve a candidate by their unguessable upload token (public page auth). */
export async function getCandidateByUploadToken(token: string): Promise<UploadCandidate | null> {
  if (!token) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from('candidates')
    .select('id,first_name,metro_area,resume_filename,resume_uploaded_at')
    .eq('upload_token', token)
    .maybeSingle();
  return (data as UploadCandidate) ?? null;
}

/** Short-lived signed download URL for a stored resume (staff view). */
export async function getResumeSignedUrl(
  path: string | null,
  expiresIn = 3600
): Promise<string | null> {
  if (!path) return null;
  const sb = createAdminClient();
  const { data } = await sb.storage.from(RESUME_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
