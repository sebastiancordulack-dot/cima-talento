// Resume upload constants + pure helpers. No 'server-only' here so the client
// upload component and the server action/read helpers can share them.

export const RESUME_BUCKET = 'resumes';
export const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_RESUME_EXT = ['pdf', 'doc', 'docx'];
export const RESUME_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Lowercased file extension without the dot, or '' if none. */
export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function isAllowedResume(name: string): boolean {
  return ALLOWED_RESUME_EXT.includes(extOf(name));
}

/** Safe filename for display/storage metadata. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'curriculum';
}
