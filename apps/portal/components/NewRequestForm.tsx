'use client';

// Two-step Solicitud form (Brief §13.2): Step 1 picks the activation type
// (card-style), Step 2 renders the type's fields (§6A / §6B). In-store
// supports multi-location batches via repeatable location blocks.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  submitSolicitud,
  type LocationInput,
  type SubmitPayload,
} from '@/lib/actions';
import { ACTIVATION_NEEDS, BUDGET_OPTIONS, STORE_TYPES } from '@/lib/status';
import type { ActivationType } from '@cima/db';

const input =
  'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500';
const label = 'mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400';

function emptyLocation(): LocationInput {
  return {
    store_name: '',
    store_address: '',
    store_type: STORE_TYPES[0],
    store_contact_name: '',
    store_contact_phone: '',
    distributor_rep_name: '',
    product_quantity: '',
    time_start: '',
    time_end: '',
    num_brand_ambassadors: 1,
  };
}

export function NewRequestForm({ brands }: { brands: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ActivationType | null>(null);

  // Shared
  const [brand, setBrand] = useState(brands[0] ?? '');
  const [brandsFeatured, setBrandsFeatured] = useState(1);

  // In-store
  const [date, setDate] = useState('');
  const [promos, setPromos] = useState('');
  const [comments, setComments] = useState('');
  const [locations, setLocations] = useState<LocationInput[]>([emptyLocation()]);

  // Field event
  const [ev, setEv] = useState({
    event_name: '',
    event_venue: '',
    event_address: '',
    event_start_date: '',
    event_end_date: '',
    setup_time: '',
    activation_time_start: '',
    activation_time_end: '',
    teardown_time: '',
    expected_attendance: '',
    num_brand_ambassadors: 2,
    activation_vision: '',
    client_supplied_assets: '',
    special_considerations: '',
    budget_range: '',
  });
  const [needs, setNeeds] = useState<string[]>([]);
  const [otherNeed, setOtherNeed] = useState('');
  const setEvField = (k: string, v: string | number) => setEv((p) => ({ ...p, [k]: v }));

  function setLocation(i: number, key: keyof LocationInput, value: string | number) {
    setLocations((prev) => prev.map((loc, j) => (j === i ? { ...loc, [key]: value } : loc)));
  }

  function toggleNeed(need: string) {
    setNeeds((prev) => (prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]));
  }

  function submit() {
    if (!type) return;
    setError(null);

    const payload: SubmitPayload =
      type === 'in_store'
        ? {
            activation_type: 'in_store',
            brand,
            brands_featured: brandsFeatured,
            date,
            special_promotions: promos,
            comments,
            locations,
          }
        : {
            activation_type: 'field_event',
            brand,
            brands_featured: brandsFeatured,
            ...ev,
            activation_needs: needs
              .filter((n) => n !== 'Other')
              .concat(needs.includes('Other') && otherNeed.trim() ? [`Other: ${otherNeed.trim()}`] : []),
          };

    start(async () => {
      const res = await submitSolicitud(payload);
      if (res.ok && res.id) {
        router.push(`/requests/${res.id}?submitted=1`);
      } else {
        setError(res.error ?? 'Something went wrong. Please try again.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // ---- Step 1: type selection (card-style, §13.2) ------------------------------
  if (!type) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setType('in_store')}
          className="rounded-xl border-2 border-gray-200 bg-white p-6 text-left transition-colors hover:border-green-500"
        >
          <p className="text-2xl">🛒</p>
          <p className="mt-2 font-semibold text-gray-900">In-Store Activation</p>
          <p className="mt-1 text-sm text-gray-500">
            Product demos, sampling, or displays at retail locations. Supports multiple stores on
            the same date in one request.
          </p>
        </button>
        <button
          onClick={() => setType('field_event')}
          className="rounded-xl border-2 border-gray-200 bg-white p-6 text-left transition-colors hover:border-green-500"
        >
          <p className="text-2xl">🎪</p>
          <p className="mt-2 font-semibold text-gray-900">Field / Event Activation</p>
          <p className="mt-1 text-sm text-gray-500">
            Brand presence at festivals, community events, trade shows, or sporting events.
          </p>
        </button>
      </div>
    );
  }

  // ---- Step 2: the form ----------------------------------------------------------
  return (
    <div className="space-y-5">
      <button onClick={() => setType(null)} className="text-sm text-gray-400 hover:text-gray-600">
        ← Change activation type
      </button>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Brand</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Brand to activate</label>
            {brands.length > 1 ? (
              <select className={input} value={brand} onChange={(e) => setBrand(e.target.value)}>
                {brands.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            ) : (
              <input className={input} value={brand} onChange={(e) => setBrand(e.target.value)} />
            )}
          </div>
          <div>
            <label className={label}>Brands featured</label>
            <select
              className={input}
              value={brandsFeatured}
              onChange={(e) => setBrandsFeatured(Number(e.target.value))}
            >
              <option value={1}>1 brand</option>
              <option value={2}>2 brands</option>
            </select>
          </div>
        </div>
      </section>

      {type === 'in_store' ? (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Activation details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Date *</label>
                <input type="date" className={input} value={date}
                  onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className={label}>Special promotions (optional)</label>
                <input className={input} placeholder="BOGO, coupon, incentive…" value={promos}
                  onChange={(e) => setPromos(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className={label}>Anything else we should know? (optional)</label>
              <textarea rows={2} className={input} value={comments}
                onChange={(e) => setComments(e.target.value)} />
            </div>
          </section>

          {locations.map((loc, i) => (
            <section key={i} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Location {locations.length > 1 ? i + 1 : ''}
                </h2>
                {locations.length > 1 && (
                  <button
                    onClick={() => setLocations((prev) => prev.filter((_, j) => j !== i))}
                    className="text-xs text-gray-400 hover:text-rose-500"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Store name *</label>
                  <input className={input} value={loc.store_name}
                    onChange={(e) => setLocation(i, 'store_name', e.target.value)} />
                </div>
                <div>
                  <label className={label}>Store type</label>
                  <select className={input} value={loc.store_type}
                    onChange={(e) => setLocation(i, 'store_type', e.target.value)}>
                    {STORE_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Store address (incl. city, state, ZIP) *</label>
                  <input className={input} value={loc.store_address}
                    onChange={(e) => setLocation(i, 'store_address', e.target.value)} />
                </div>
                <div>
                  <label className={label}>Store contact name</label>
                  <input className={input} value={loc.store_contact_name}
                    onChange={(e) => setLocation(i, 'store_contact_name', e.target.value)} />
                </div>
                <div>
                  <label className={label}>Store contact phone</label>
                  <input className={input} value={loc.store_contact_phone}
                    onChange={(e) => setLocation(i, 'store_contact_phone', e.target.value)} />
                </div>
                <div>
                  <label className={label}>Distributor / sales rep</label>
                  <input className={input} value={loc.distributor_rep_name}
                    onChange={(e) => setLocation(i, 'distributor_rep_name', e.target.value)} />
                </div>
                <div>
                  <label className={label}>Product available (e.g. “25+ cases”)</label>
                  <input className={input} value={loc.product_quantity}
                    onChange={(e) => setLocation(i, 'product_quantity', e.target.value)} />
                </div>
                <div>
                  <label className={label}>Start time *</label>
                  <input type="time" className={input} value={loc.time_start}
                    onChange={(e) => setLocation(i, 'time_start', e.target.value)} />
                </div>
                <div>
                  <label className={label}>End time *</label>
                  <input type="time" className={input} value={loc.time_end}
                    onChange={(e) => setLocation(i, 'time_end', e.target.value)} />
                </div>
                <div>
                  <label className={label}>Brand ambassadors at this location *</label>
                  <input type="number" min={1} className={input} value={loc.num_brand_ambassadors}
                    onChange={(e) => setLocation(i, 'num_brand_ambassadors', Number(e.target.value))} />
                </div>
              </div>
            </section>
          ))}

          <button
            onClick={() => setLocations((prev) => [...prev, emptyLocation()])}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          >
            + Add another location (same date)
          </button>
        </>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Event basics</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Event name *</label>
                <input className={input} placeholder="e.g. BBQ Battle DC 2026" value={ev.event_name}
                  onChange={(e) => setEvField('event_name', e.target.value)} />
              </div>
              <div>
                <label className={label}>Venue</label>
                <input className={input} value={ev.event_venue}
                  onChange={(e) => setEvField('event_venue', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Address (incl. city, state, ZIP) *</label>
                <input className={input} value={ev.event_address}
                  onChange={(e) => setEvField('event_address', e.target.value)} />
              </div>
              <div>
                <label className={label}>Start date *</label>
                <input type="date" className={input} value={ev.event_start_date}
                  onChange={(e) => setEvField('event_start_date', e.target.value)} />
              </div>
              <div>
                <label className={label}>End date (multi-day events)</label>
                <input type="date" className={input} value={ev.event_end_date}
                  onChange={(e) => setEvField('event_end_date', e.target.value)} />
              </div>
              <div>
                <label className={label}>Setup time</label>
                <input type="time" className={input} value={ev.setup_time}
                  onChange={(e) => setEvField('setup_time', e.target.value)} />
              </div>
              <div>
                <label className={label}>Teardown complete by</label>
                <input type="time" className={input} value={ev.teardown_time}
                  onChange={(e) => setEvField('teardown_time', e.target.value)} />
              </div>
              <div>
                <label className={label}>Activation starts</label>
                <input type="time" className={input} value={ev.activation_time_start}
                  onChange={(e) => setEvField('activation_time_start', e.target.value)} />
              </div>
              <div>
                <label className={label}>Activation ends</label>
                <input type="time" className={input} value={ev.activation_time_end}
                  onChange={(e) => setEvField('activation_time_end', e.target.value)} />
              </div>
              <div>
                <label className={label}>Expected attendance</label>
                <input className={input} placeholder="e.g. 15,000+" value={ev.expected_attendance}
                  onChange={(e) => setEvField('expected_attendance', e.target.value)} />
              </div>
              <div>
                <label className={label}>Brand ambassadors requested *</label>
                <input type="number" min={1} className={input} value={ev.num_brand_ambassadors}
                  onChange={(e) => setEvField('num_brand_ambassadors', Number(e.target.value))} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Activation needs</h2>
            <p className="mb-3 text-xs text-gray-500">
              Select everything that applies — this shapes our planning and quote.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACTIVATION_NEEDS.map((need) => (
                <label key={need} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={needs.includes(need)}
                    onChange={() => toggleNeed(need)}
                  />
                  {need}
                </label>
              ))}
            </div>
            {needs.includes('Other') && (
              <input
                className={`${input} mt-2`}
                placeholder="Tell us more…"
                value={otherNeed}
                onChange={(e) => setOtherNeed(e.target.value)}
              />
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Vision & logistics</h2>
            <div className="space-y-3">
              <div>
                <label className={label}>Your vision for the activation (optional)</label>
                <textarea rows={3} className={input} value={ev.activation_vision}
                  placeholder="Leave blank and CiMA will propose a concept."
                  onChange={(e) => setEvField('activation_vision', e.target.value)} />
              </div>
              <div>
                <label className={label}>Assets you&apos;ll supply (optional)</label>
                <textarea rows={2} className={input} value={ev.client_supplied_assets}
                  placeholder="Brand art files, QR codes, flags, branded materials…"
                  onChange={(e) => setEvField('client_supplied_assets', e.target.value)} />
              </div>
              <div>
                <label className={label}>Special considerations (optional)</label>
                <textarea rows={2} className={input} value={ev.special_considerations}
                  placeholder="Venue restrictions, electricity, cooling, exclusivity concerns…"
                  onChange={(e) => setEvField('special_considerations', e.target.value)} />
              </div>
              <div className="sm:w-1/2">
                <label className={label}>Budget range (optional)</label>
                <select className={input} value={ev.budget_range}
                  onChange={(e) => setEvField('budget_range', e.target.value)}>
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
          {pending ? 'Submitting…' : 'Submit request'}
        </button>
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </div>
  );
}
