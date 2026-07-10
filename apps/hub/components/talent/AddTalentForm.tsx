'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTalentMember } from '@/lib/talent/actions';
import type { Availability } from '@cima/db';

const DAYS: { key: keyof Availability; label: string }[] = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mié' },
  { key: 'thu', label: 'Jue' },
  { key: 'fri', label: 'Vie' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];

const DEFAULT_HOURS = '09:00-17:00';

export interface TalentPrefill {
  first_name?: string;
  last_name?: string | null;
  email?: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  metro_area?: string | null;
}

export function AddTalentForm({
  onDone,
  initial,
  lockEmail = false,
  title = 'Agregar persona a la Red de Talento',
  submitLabel = 'Agregar a la red',
}: {
  onDone: () => void;
  initial?: TalentPrefill;
  lockEmail?: boolean;
  title?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    first_name: initial?.first_name ?? '',
    last_name: initial?.last_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    zip_code: initial?.zip_code ?? '',
    metro_area: initial?.metro_area ?? '',
    onboarding_complete: false,
    send_welcome: false,
  });
  const [days, setDays] = useState<Record<string, boolean>>({});

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const input = 'w-full rounded-xl border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

  function submit() {
    setError(null);
    const availability: Availability = {};
    for (const d of DAYS) if (days[d.key]) availability[d.key] = [DEFAULT_HOURS];

    start(async () => {
      const res = await addTalentMember({
        first_name: f.first_name,
        last_name: f.last_name || undefined,
        email: f.email,
        phone: f.phone || undefined,
        city: f.city || undefined,
        state: f.state || undefined,
        zip_code: f.zip_code || undefined,
        metro_area: f.metro_area || undefined,
        availability,
        onboarding_complete: f.onboarding_complete,
        send_welcome: f.send_welcome,
      });
      if (res.ok) { router.refresh(); onDone(); }
      else setError(res.error ?? 'No se pudo agregar.');
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-card-hover">
      <h3 className="mb-3 text-sm font-semibold text-stone-900">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Nombre *</label>
          <input className={input} value={f.first_name} onChange={(e) => set('first_name', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Apellido</label>
          <input className={input} value={f.last_name} onChange={(e) => set('last_name', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Correo *</label>
          <input
            type="email"
            className={`${input} ${lockEmail ? 'bg-stone-50 text-stone-500' : ''}`}
            value={f.email}
            onChange={(e) => set('email', e.target.value)}
            readOnly={lockEmail}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Teléfono</label>
          <input className={input} value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Ciudad</label>
          <input className={input} value={f.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Estado</label>
            <input className={input} value={f.state} onChange={(e) => set('state', e.target.value)} placeholder="TX" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">ZIP</label>
            <input className={input} value={f.zip_code} onChange={(e) => set('zip_code', e.target.value)} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Metro (opcional — se deriva de la ciudad/ZIP si se deja vacío)
          </label>
          <input className={input} value={f.metro_area} onChange={(e) => set('metro_area', e.target.value)} placeholder="Dallas–Fort Worth" />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-stone-600">Días disponibles</label>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDays((p) => ({ ...p, [d.key]: !p[d.key] }))}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                days[d.key] ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={f.onboarding_complete} onChange={(e) => set('onboarding_complete', e.target.checked)} className="size-4 rounded accent-brand-600" />
          Onboarding completo
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={f.send_welcome} onChange={(e) => set('send_welcome', e.target.checked)} className="size-4 rounded accent-brand-600" />
          Enviar correo de bienvenida (Email 4)
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button onClick={submit} disabled={pending} className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50">
          {pending ? 'Guardando…' : submitLabel}
        </button>
        <button onClick={onDone} disabled={pending} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-card transition-colors hover:bg-stone-50">
          Cancelar
        </button>
      </div>
    </div>
  );
}
