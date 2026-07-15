'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TBody, Td, Th, THead, Table, Tr } from '@cima/ui';
import { StatusBadge } from '@/components/StatusBadge';
import { RoleBadge } from '@/components/RoleBadge';
import { PreviouslyRejectedBadge } from '@/components/PreviouslyRejectedBadge';
import { assignRoleBulk } from '@/lib/candidates/actions';
import { CANDIDATE_ROLES, ROLE_LABELS, resumeRequired } from '@/lib/candidates/roles';
import { formatDate, fullName } from '@/lib/format';
import type { Candidate } from '@/lib/candidates/queries';
import type { CandidateRole } from '@cima/db';

// The "Lista" view (spec §7.2): one flat, lean table — metro as a column, no
// inline actions. The whole row opens the profile, where all actions live
// (fit/no-fit, scorecard, notes, WhatsApp). Mirrors the Activaciones queue.
//
// Rows are also selectable (checkbox column) to bulk-assign the mercaderista /
// promotor-a role — the backfill workflow for candidates created before roles
// existed. Selection controls sit above the row-link overlay (relative z-10).
export function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const allSelected = candidates.length > 0 && candidates.every((c) => selected.has(c.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  }

  function bulkAssign(role: CandidateRole) {
    setError(null);
    start(async () => {
      const res = await assignRoleBulk(Array.from(selected), role);
      if (!res.ok) {
        setError(res.error ?? 'No se pudo asignar.');
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 bg-stone-50/70 px-5 py-2.5 text-sm">
          <span className="font-medium tabular-nums text-stone-700">
            {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
          </span>
          <span className="text-stone-400">Asignar rol:</span>
          {CANDIDATE_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => bulkAssign(r)}
              disabled={pending}
              className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-card transition-colors hover:bg-stone-100 disabled:opacity-50"
            >
              {pending ? 'Asignando…' : ROLE_LABELS[r]}
            </button>
          ))}
          <button
            onClick={() => setSelected(new Set())}
            disabled={pending}
            className="ml-auto text-xs font-medium text-stone-400 hover:text-stone-600"
          >
            Limpiar selección
          </button>
          {error && <span className="w-full text-xs text-rose-600">{error}</span>}
        </div>
      )}
      <Table>
        <THead>
          <Th className="w-8">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 rounded accent-brand-600"
              aria-label="Seleccionar todos"
            />
          </Th>
          <Th>Nombre</Th>
          <Th>Rol</Th>
          <Th>Metro</Th>
          <Th>Teléfono</Th>
          <Th>CV</Th>
          <Th>Estado</Th>
          <Th>Recibido</Th>
        </THead>
        <TBody>
          {candidates.map((c) => (
            <Tr key={c.id} interactive className="relative">
              <Td>
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="relative z-10 size-4 rounded accent-brand-600"
                  aria-label={`Seleccionar a ${c.first_name}`}
                />
              </Td>
              <Td>
                <Link
                  href={`/dashboard/candidates/${c.id}`}
                  className="font-medium text-stone-900 after:absolute after:inset-0"
                >
                  {fullName(c.first_name, c.last_name)}
                </Link>
                <p className="text-xs text-stone-400">{c.email}</p>
                <PreviouslyRejectedBadge rejectedAt={c.previously_rejected_at} />
              </Td>
              <Td>
                <RoleBadge role={c.role} />
              </Td>
              <Td className="whitespace-nowrap text-stone-600">
                {c.metro_area ?? <span className="text-stone-300">Sin metro</span>}
              </Td>
              <Td className="whitespace-nowrap text-stone-600">{c.phone ?? '—'}</Td>
              <Td>
                {c.resume_uploaded_at ? (
                  <span className="inline-flex whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    CV ✓
                  </span>
                ) : resumeRequired(c.role) ? (
                  <span className="inline-flex whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Pendiente
                  </span>
                ) : (
                  <span className="whitespace-nowrap text-xs text-stone-400">No requerido</span>
                )}
              </Td>
              <Td>
                <StatusBadge status={c.status} />
              </Td>
              <Td className="whitespace-nowrap text-stone-400">{formatDate(c.created_at)}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
