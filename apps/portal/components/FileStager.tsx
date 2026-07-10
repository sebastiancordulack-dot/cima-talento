'use client';

import { useRef, useState } from 'react';
import { Button } from '@cima/ui';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS_PER_REQUEST,
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  isAllowedAttachment,
} from '@/lib/attachments';

// Staged-file picker for the new-request form: files are held in memory and
// uploaded via uploadAttachment AFTER the Solicitud exists (there is no id to
// attach to before then, and per-file calls stay under the action body cap).
export function FileStager({
  files,
  onChange,
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function onPick(picked: FileList | null) {
    setError(null);
    if (!picked || picked.length === 0) return;
    const next = [...files];
    for (const file of Array.from(picked)) {
      if (next.length >= MAX_ATTACHMENTS_PER_REQUEST) {
        setError(`Up to ${MAX_ATTACHMENTS_PER_REQUEST} files per request.`);
        break;
      }
      if (!isAllowedAttachment(file.name)) {
        setError(`"${file.name}" is not a supported file type.`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`"${file.name}" is over the 10 MB limit.`);
        continue;
      }
      next.push(file);
    }
    onChange(next);
  }

  return (
    <div>
      {files.length > 0 && (
        <ul className="mb-3 divide-y divide-stone-100/70">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-800">{file.name}</p>
                <p className="text-xs text-stone-400">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="shrink-0 text-xs font-medium text-stone-400 hover:text-rose-500"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = ''; // allow re-picking the same file
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || files.length >= MAX_ATTACHMENTS_PER_REQUEST}
          onClick={() => inputRef.current?.click()}
        >
          + Add file
        </Button>
        <span className="text-xs text-stone-400">
          Up to {MAX_ATTACHMENTS_PER_REQUEST} files · 10 MB each · PDF, Office, images, or ZIP
        </span>
      </div>
    </div>
  );
}
