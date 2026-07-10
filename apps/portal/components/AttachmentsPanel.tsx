'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@cima/ui';
import { deleteAttachment, uploadAttachment } from '@/lib/actions';
import type { AttachmentWithUrl } from '@/lib/attachment-urls';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS_PER_REQUEST,
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  isAllowedAttachment,
} from '@/lib/attachments';

// File list + uploader for a request (migration 0009). Picking a file uploads
// it immediately; the server action revalidates the detail route, so the list
// refreshes through props — no local copy of the data.
export function AttachmentsPanel({
  solicitudId,
  attachments,
  canUpload,
}: {
  solicitudId: string;
  attachments: AttachmentWithUrl[];
  canUpload: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startRemove] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(file: File | null) {
    setError(null);
    if (!file) return;
    if (!isAllowedAttachment(file.name)) {
      return setError('This file type is not supported.');
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return setError('This file is over the 10 MB limit.');
    }
    const fd = new FormData();
    fd.append('file', file);
    startUpload(async () => {
      const res = await uploadAttachment(solicitudId, fd);
      if (!res.ok) setError(res.error ?? 'The file could not be uploaded.');
    });
  }

  function onRemove(id: string) {
    setError(null);
    setRemovingId(id);
    startRemove(async () => {
      const res = await deleteAttachment(id);
      if (!res.ok) setError(res.error ?? 'The file could not be removed.');
      setRemovingId(null);
    });
  }

  return (
    <div>
      {attachments.length > 0 ? (
        <ul className="divide-y divide-stone-100/70">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-brand-700 hover:underline"
                  >
                    {a.file_name}
                  </a>
                ) : (
                  <span className="block truncate text-sm text-stone-700">{a.file_name}</span>
                )}
                <p className="text-xs text-stone-400">
                  {formatBytes(a.size_bytes)} ·{' '}
                  {new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(new Date(a.created_at))}
                </p>
              </div>
              {canUpload && a.uploaded_by === 'client' && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={removingId === a.id}
                  onClick={() => onRemove(a.id)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-500">No files yet.</p>
      )}

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      {canUpload && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              onPick(e.target.files?.[0] ?? null);
              e.target.value = ''; // allow re-picking the same file
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={uploading}
            disabled={attachments.length >= MAX_ATTACHMENTS_PER_REQUEST}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : '+ Add file'}
          </Button>
          <span className="text-xs text-stone-400">
            Up to {MAX_ATTACHMENTS_PER_REQUEST} files · 10 MB each · PDF, Office, images, or ZIP
          </span>
        </div>
      )}
    </div>
  );
}
