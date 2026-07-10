import Link from 'next/link';
import { TBody, Td, Th, THead, Table, Tr } from '@cima/ui';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, fullName } from '@/lib/format';
import type { Candidate } from '@/lib/candidates/queries';

// The "Lista" view (spec §7.2): one flat, lean table — metro as a column, no
// inline actions. The whole row opens the profile, where all actions live
// (fit/no-fit, scorecard, notes, WhatsApp). Mirrors the Activaciones queue.
export function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  return (
    <Table>
      <THead>
        <Th>Nombre</Th>
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
              <Link
                href={`/dashboard/candidates/${c.id}`}
                className="font-medium text-stone-900 after:absolute after:inset-0"
              >
                {fullName(c.first_name, c.last_name)}
              </Link>
              <p className="text-xs text-stone-400">{c.email}</p>
            </Td>
            <Td className="whitespace-nowrap text-stone-600">
              {c.metro_area ?? <span className="text-stone-300">Sin metro</span>}
            </Td>
            <Td className="whitespace-nowrap text-stone-600">{c.phone ?? '—'}</Td>
            <Td>
              {c.resume_uploaded_at ? (
                <span className="inline-flex whitespace-nowrap rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  CV ✓
                </span>
              ) : (
                <span className="inline-flex whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Pendiente
                </span>
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
  );
}
