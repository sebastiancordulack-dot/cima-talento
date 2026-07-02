'use server';

// Public resume upload action. Authenticated by the candidate's upload token
// (no login). Validates the file, stores it in the private `resumes` bucket via
// the service-role client, and stamps the candidate row. Latest upload wins.
import { createAdminClient } from '@cima/db/admin';
import {
  RESUME_BUCKET,
  MAX_RESUME_BYTES,
  isAllowedResume,
  extOf,
  sanitizeFilename,
} from '@/lib/candidates/resume-constants';

export interface UploadResult {
  ok: boolean;
  error?: string;
}

export async function uploadResume(token: string, formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'Selecciona un archivo.' };
    }
    if (file.size > MAX_RESUME_BYTES) {
      return { ok: false, error: 'El archivo supera el límite de 10 MB.' };
    }
    if (!isAllowedResume(file.name)) {
      return { ok: false, error: 'Solo se permiten archivos PDF o Word (.pdf, .doc, .docx).' };
    }

    const sb = createAdminClient();
    const { data: cand } = await sb
      .from('candidates')
      .select('id,resume_path')
      .eq('upload_token', token)
      .maybeSingle();
    if (!cand) return { ok: false, error: 'Enlace inválido o vencido.' };

    const path = `${cand.id}/curriculum.${extOf(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await sb.storage
      .from(RESUME_BUCKET)
      .upload(path, buffer, { contentType: file.type || undefined, upsert: true });
    if (upErr) return { ok: false, error: upErr.message };

    // If a prior resume had a different extension, remove it (latest wins).
    if (cand.resume_path && cand.resume_path !== path) {
      await sb.storage.from(RESUME_BUCKET).remove([cand.resume_path]);
    }

    const { error: updErr } = await sb
      .from('candidates')
      .update({
        resume_path: path,
        resume_filename: sanitizeFilename(file.name),
        resume_uploaded_at: new Date().toISOString(),
      })
      .eq('id', cand.id);
    if (updErr) return { ok: false, error: updErr.message };

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo subir el archivo.' };
  }
}
