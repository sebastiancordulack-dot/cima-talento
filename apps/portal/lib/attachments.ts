// Attachment constants + pure helpers. No 'server-only' here so the client
// panel and the server actions/read helpers can share them (same split as the
// Hub's resume-constants).

export const ATTACHMENTS_BUCKET = 'solicitud-attachments';
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB (action body cap is 12 MB)
export const MAX_ATTACHMENTS_PER_REQUEST = 10;

// Brand assets, product sheets, planograms: documents, images, or a zip.
export const ALLOWED_ATTACHMENT_EXT = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'zip',
];
export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_EXT.map((e) => `.${e}`).join(',');

/** Lowercased file extension without the dot, or '' if none. */
export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function isAllowedAttachment(name: string): boolean {
  return ALLOWED_ATTACHMENT_EXT.includes(extOf(name));
}

/** Safe filename for display/storage metadata. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'file';
}

/** Human-readable size for the panel ("824 KB", "2.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
