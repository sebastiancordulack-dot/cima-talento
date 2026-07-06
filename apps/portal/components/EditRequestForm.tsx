'use client';

// Edit Request (Brief §13.4): available while the request is still
// submitted / in_review. Edits one record — for multi-location submissions,
// each location is edited from its own page.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateSolicitud, type EditPayload, type LocationInput } from '@/lib/actions';
import { ACTIVATION_NEEDS, BUDGET_OPTIONS, STORE_TYPES } from '@/lib/status';
import { parseDateRange } from '@cima/activaciones/dates';
import type { ClientSolicitud } from '@/lib/queries';

const input =
  'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500';
const label = 'mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400';

const t = (v: string | null) => (v ? v.slice(0, 5) : '');

export function EditRequestForm({ solicitud }: { solicitud: ClientSolicitud }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isStore = solicitud.activation_type === 'in_store';
  const span = parseDateRange(solicitud.event_dates);

  const [date, setDate] = useState(solicitud.date ?? '');
  const [promos, setPromos] = useState(solicitud.special_promotions ?? '');
  const [comments, setComments] = useState(solicitud.comments ?? '');
  const [loc, setLoc] = useState<LocationInput>({
    store_name: solicitud.store_name ?? '',
    store_address: solicitud.store_address ?? '',
    store_type: solicitud.store_type ?? STORE_TYPES[0],
    store_contact_name: solicitud.store_contact_name ?? '',
    store_contact_phone: solicitud.store_contact_phone ?? '',
    distributor_rep_name: solicitud.distributor_rep_name ?? '',
    product_quantity: solicitud.product_quantity ?? '',
    time_start: t(solicitud.time_start),
    time_end: t(solicitud.time_end),
    num_brand_ambassadors: solicitud.num_brand_ambassadors ?? 1,
  });
  const setL = (k: keyof LocationInput, v: string | number) =>
    setLoc((p) => ({ ...p, [k]: v }));

  const [ev, setEv] = useState({
    event_name: solicitud.event_name ?? '',
    event_venue: solicitud.event_venue ?? '',
    event_address: solicitud.event_address ?? '',
    event_start_date: span?.start ?? '',
    event_end_date: span?.end ?? '',
    setup_time: t(solicitud.setup_time),
    activation_time_start: t(solicitud.activation_time_start),
    activation_time_end: t(solicitud.activation_time_end),
    teardown_time: t(solicitud.teardown_time),
    expected_attendance: solicitud.expected_attendance ?? '',
    num_brand_ambassadors: solicitud.num_brand_ambassadors ?? 2,
    activation_vision: solicitud.activation_vision ?? '',
    client_supplied_assets: solicitud.client_supplied_assets ?? '',
    special_considerations: solicitud.special_considerations ?? '',
    budget_range: solicitud.budget_range ?? '',
  });
  const setE = (k: string, v: string | number) => setEv((p) => ({ ...p, [k]: v }));
  const [needs, setNeeds] = useState<string[]>(solicitud.activation_needs ?? []);
  const toggleNeed = (need: string) =>
    setNeeds((prev) => (prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]));

  function submit() {
    setError(null);
    const payload: EditPayload = isStore
      ? {
          activation_type: 'in_store',
          date,
          special_promotions: promos,
          comments,
          location: loc,
        }
      : {
          activation_type: 'field_event',
          ...ev,
          activation_needs: needs,
        };

    start(async () => {
      const res = await updateSolicitud(solicitud.id, payload);
      if (res.ok) {
        router.push(`/requests/${solicitud.id}`);
        router.refresh();
      } else {
        setError(res.error ?? 'Something went wrong.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {isStore ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Activation details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Date *</label>
              <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={label}>Special promotions</label>
              <input className={input} value={promos} onChange={(e) => setPromos(e.target.value)} />
            </div>
            <div>
              <label className={label}>Store name *</label>
              <input className={input} value={loc.store_name}
                onChange={(e) => setL('store_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>Store type</label>
              <select className={input} value={loc.store_type}
                onChange={(e) => setL('store_type', e.target.value)}>
                {STORE_TYPES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Store address *</label>
              <input className={input} value={loc.store_address}
                onChange={(e) => setL('store_address', e.target.value)} />
            </div>
            <div>
              <label className={label}>Store contact name</label>
              <input className={input} value={loc.store_contact_name}
                onChange={(e) => setL('store_contact_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>Store contact phone</label>
              <input className={input} value={loc.store_contact_phone}
                onChange={(e) => setL('store_contact_phone', e.target.value)} />
            </div>
            <div>
              <label className={label}>Distributor / sales rep</label>
              <input className={input} value={loc.distributor_rep_name}
                onChange={(e) => setL('distributor_rep_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>Product available</label>
              <input className={input} value={loc.product_quantity}
                onChange={(e) => setL('product_quantity', e.target.value)} />
            </div>
            <div>
              <label className={label}>Start time *</label>
              <input type="time" className={input} value={loc.time_start}
                onChange={(e) => setL('time_start', e.target.value)} />
            </div>
            <div>
              <label className={label}>End time *</label>
              <input type="time" className={input} value={loc.time_end}
                onChange={(e) => setL('time_end', e.target.value)} />
            </div>
            <div>
              <label className={label}>Brand ambassadors *</label>
              <input type="number" min={1} className={input} value={loc.num_brand_ambassadors}
                onChange={(e) => setL('num_brand_ambassadors', Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Comments</label>
              <textarea rows={2} className={input} value={comments}
                onChange={(e) => setComments(e.target.value)} />
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Event basics</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Event name *</label>
                <input className={input} value={ev.event_name}
                  onChange={(e) => setE('event_name', e.target.value)} />
              </div>
              <div>
                <label className={label}>Venue</label>
                <input className={input} value={ev.event_venue}
                  onChange={(e) => setE('event_venue', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Address *</label>
                <input className={input} value={ev.event_address}
                  onChange={(e) => setE('event_address', e.target.value)} />
              </div>
              <div>
                <label className={label}>Start date *</label>
                <input type="date" className={input} value={ev.event_start_date}
                  onChange={(e) => setE('event_start_date', e.target.value)} />
              </div>
              <div>
                <label className={label}>End date</label>
                <input type="date" className={input} value={ev.event_end_date}
                  onChange={(e) => setE('event_end_date', e.target.value)} />
              </div>
              <div>
                <label className={label}>Setup time</label>
                <input type="time" className={input} value={ev.setup_time}
                  onChange={(e) => setE('setup_time', e.target.value)} />
              </div>
              <div>
                <label className={label}>Teardown complete by</label>
                <input type="time" className={input} value={ev.teardown_time}
                  onChange={(e) => setE('teardown_time', e.target.value)} />
              </div>
              <div>
                <label className={label}>Activation starts</label>
                <input type="time" className={input} value={ev.activation_time_start}
                  onChange={(e) => setE('activation_time_start', e.target.value)} />
              </div>
              <div>
                <label className={label}>Activation ends</label>
                <input type="time" className={input} value={ev.activation_time_end}
                  onChange={(e) => setE('activation_time_end', e.target.value)} />
              </div>
              <div>
                <label className={label}>Expected attendance</label>
                <input className={input} value={ev.expected_attendance}
                  onChange={(e) => setE('expected_attendance', e.target.value)} />
              </div>
              <div>
                <label className={label}>Brand ambassadors *</label>
                <input type="number" min={1} className={input} value={ev.num_brand_ambassadors}
                  onChange={(e) => setE('num_brand_ambassadors', Number(e.target.value))} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Activation needs</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACTIVATION_NEEDS.map((need) => (
                <label key={need} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={needs.includes(need)} onChange={() => toggleNeed(need)} />
                  {need}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Vision & logistics</h2>
            <div className="space-y-3">
              <div>
                <label className={label}>Your vision</label>
                <textarea rows={3} className={input} value={ev.activation_vision}
                  onChange={(e) => setE('activation_vision', e.target.value)} />
              </div>
              <div>
                <label className={label}>Assets you&apos;ll supply</label>
                <textarea rows={2} className={input} value={ev.client_supplied_assets}
                  onChange={(e) => setE('client_supplied_assets', e.target.value)} />
              </div>
              <div>
                <label className={label}>Special considerations</label>
                <textarea rows={2} className={input} value={ev.special_considerations}
                  onChange={(e) => setE('special_considerations', e.target.value)} />
              </div>
              <div className="sm:w-1/2">
                <label className={label}>Budget range</label>
                <select className={input} value={ev.budget_range ?? ''}
                  onChange={(e) => setE('budget_range', e.target.value)}>
                  <option value="">Select…</option>
                  {BUDGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          onClick={() => router.push(`/requests/${solicitud.id}`)}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
