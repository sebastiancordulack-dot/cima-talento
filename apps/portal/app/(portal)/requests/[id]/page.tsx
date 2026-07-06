import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApproveQuoteButton } from '@/components/ApproveQuoteButton';
import { ChangeResponseButtons } from '@/components/ChangeResponseButtons';
import { StatusBadge } from '@/components/StatusBadge';
import { getClientSolicitud, type ClientChange, type ClientStatusLog } from '@/lib/queries';
import { CLIENT_STATUS_META } from '@/lib/status';
import { formatPlainDate, formatSolicitudDates } from '@cima/activaciones/dates';
import { formatMoney, parseQuoteData, sectionSubtotal } from '@cima/activaciones/quote';

export const dynamic = 'force-dynamic';

function time(t: string | null): string {
  return t ? t.slice(0, 5) : '—';
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="col-span-2 text-sm text-gray-800">{value}</dd>
    </div>
  );
}

// Request detail (Brief §13.4): original submission read-only, plain-English
// status, quote (visible once sent — the view gates the columns), proposed
// changes, and the client-visible timeline. Approve/decline interactions land
// with the approval flows (build-order Step 7).
export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { submitted?: string };
}) {
  const detail = await getClientSolicitud(params.id);
  if (!detail) notFound();
  const { solicitud: s, siblings, changes, log } = detail;

  const meta = CLIENT_STATUS_META[s.status];
  const quote = parseQuoteData(s.quote_line_items);
  const place = s.activation_type === 'in_store' ? s.store_name : s.event_name;

  return (
    <div>
      <Link href="/requests" className="text-sm text-gray-400 hover:text-gray-600">
        ← My Requests
      </Link>

      {searchParams.submitted && (
        <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          <span className="font-semibold">Request submitted!</span> We&apos;ll review it and get
          back to you within 2 business days. A confirmation email is on its way.
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{s.brand}</h1>
          <StatusBadge status={s.status} />
        </div>
        {(s.status === 'submitted' || s.status === 'in_review') && (
          <Link
            href={`/requests/${s.id}/edit`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit request
          </Link>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {place} · {formatSolicitudDates(s)}
      </p>

      {/* Plain-English status explanation (§13.4). */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-700">{meta.explanation}</p>
      </div>

      {/* Quote — the view nulls these columns until the quote is actually sent. */}
      {s.quote_amount != null && (
        <section className="mt-4 rounded-xl border border-green-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Your quote</h2>
            <span className="text-lg font-bold text-gray-900">{formatMoney(s.quote_amount)}</span>
          </div>
          {quote && quote.sections.length > 0 && (
            <div className="mt-3 space-y-4">
              {quote.sections.map((section) => (
                <div key={section.solicitud_id}>
                  {quote.sections.length > 1 && (
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        {section.label}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatMoney(sectionSubtotal(section))}
                      </span>
                    </div>
                  )}
                  <ul className="divide-y divide-gray-50">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-gray-700">{item.concept}</span>
                        <span className="text-gray-900">{formatMoney(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {s.quote_notes && <p className="mt-3 text-xs text-gray-500">{s.quote_notes}</p>}
          {s.status === 'quote_sent' && (
            <ApproveQuoteButton solicitudId={s.id} locationCount={siblings.length + 1} />
          )}
        </section>
      )}

      {/* Proposed changes (§13.4). */}
      {changes.length > 0 && (
        <section className="mt-4 rounded-xl border border-violet-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Proposed changes</h2>
          <ul className="space-y-3">
            {changes.map((c: ClientChange) => (
              <li key={c.id} className="rounded-lg bg-violet-50/50 p-3">
                <p className="text-sm text-gray-800">
                  {c.original_value && (
                    <>
                      <span className="line-through">{c.original_value}</span>
                      {' → '}
                    </>
                  )}
                  <span className="font-semibold">{c.proposed_value}</span>
                </p>
                {c.reason && <p className="mt-1 text-xs text-gray-500">{c.reason}</p>}
                {c.client_response === 'pending' && s.status === 'changes_proposed' ? (
                  <ChangeResponseButtons changeId={c.id} />
                ) : (
                  <p className="mt-1 text-xs font-medium text-violet-700">
                    {c.client_response === 'pending'
                      ? 'Awaiting your response'
                      : c.client_response === 'approved'
                        ? 'You approved this change'
                        : 'You declined this change'}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The original submission, read-only. */}
      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Your submission</h2>
        <dl className="divide-y divide-gray-50">
          <Row label="Brand" value={s.brand} />
          <Row label="Brands featured" value={s.brands_featured} />
          <Row label="Brand ambassadors" value={s.num_brand_ambassadors} />
          {s.activation_type === 'in_store' ? (
            <>
              <Row label="Date" value={formatPlainDate(s.date)} />
              <Row label="Time" value={`${time(s.time_start)} – ${time(s.time_end)}`} />
              <Row label="Store" value={s.store_name} />
              <Row label="Address" value={s.store_address} />
              <Row label="Store type" value={s.store_type} />
              <Row label="Store contact" value={[s.store_contact_name, s.store_contact_phone].filter(Boolean).join(' · ')} />
              <Row label="Distributor rep" value={s.distributor_rep_name} />
              <Row label="Product available" value={s.product_quantity} />
              <Row label="Promotions" value={s.special_promotions} />
              <Row label="Comments" value={s.comments} />
            </>
          ) : (
            <>
              <Row label="Event" value={s.event_name} />
              <Row label="Venue" value={s.event_venue} />
              <Row label="Address" value={s.event_address} />
              <Row label="Dates" value={formatSolicitudDates(s)} />
              <Row label="Setup" value={s.setup_time ? time(s.setup_time) : null} />
              <Row
                label="Activation"
                value={
                  s.activation_time_start
                    ? `${time(s.activation_time_start)} – ${time(s.activation_time_end)}`
                    : null
                }
              />
              <Row label="Teardown" value={s.teardown_time ? time(s.teardown_time) : null} />
              <Row label="Expected attendance" value={s.expected_attendance} />
              <Row
                label="Needs"
                value={s.activation_needs.length > 0 ? s.activation_needs.join(' · ') : null}
              />
              <Row label="Your vision" value={s.activation_vision} />
              <Row label="Assets you supply" value={s.client_supplied_assets} />
              <Row label="Considerations" value={s.special_considerations} />
            </>
          )}
        </dl>
      </section>

      {/* Other locations in the same submission. */}
      {siblings.length > 0 && (
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">
            Other locations in this submission
          </h2>
          <ul className="divide-y divide-gray-50">
            {siblings.map((sib) => (
              <li key={sib.id} className="flex items-center justify-between py-2">
                <Link href={`/requests/${sib.id}`} className="text-sm text-green-700 hover:underline">
                  {sib.store_name}
                </Link>
                <StatusBadge status={sib.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Client-visible timeline (§13.4). */}
      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Timeline</h2>
        <ul className="space-y-2">
          {log.map((entry: ClientStatusLog) => (
            <li key={entry.id} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 text-xs text-gray-400">
                {new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: 'America/New_York',
                }).format(new Date(entry.changed_at))}
              </span>
              <StatusBadge status={entry.to_status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
