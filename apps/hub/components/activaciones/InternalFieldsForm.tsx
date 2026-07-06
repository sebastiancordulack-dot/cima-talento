'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateInternalFields, type InternalFieldsInput } from '@/modules/activaciones/actions';
import type { Database } from '@cima/db';

type Solicitud = Database['public']['Tables']['solicitudes']['Row'];

const input =
  'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500';
const label = 'mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400';

// CiMA workspace fields (Brief §7 / §12.2) — never client-visible.
export function InternalFieldsForm({ solicitud }: { solicitud: Solicitud }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isStore = solicitud.activation_type === 'in_store';

  const [f, setF] = useState({
    internal_notes: solicitud.internal_notes ?? '',
    verification_notes: solicitud.verification_notes ?? '',
    store_condition: solicitud.store_condition ?? '',
    product_location_in_store: solicitud.product_location_in_store ?? '',
    coi_required: solicitud.coi_required ?? false,
    coi_named_insured: solicitud.coi_named_insured ?? '',
    coi_status: solicitud.coi_status ?? 'pending',
    participation_agreement_required: solicitud.participation_agreement_required ?? false,
    participation_agreement_payment: solicitud.participation_agreement_payment ?? false,
    participation_agreement_amount: solicitud.participation_agreement_amount?.toString() ?? '',
    third_party_vendors: solicitud.third_party_vendors ?? '',
    fabrication_notes: solicitud.fabrication_notes ?? '',
    logistics_notes: solicitud.logistics_notes ?? '',
    asset_delivery_status: solicitud.asset_delivery_status ?? '',
    content_creation_brief: solicitud.content_creation_brief ?? '',
  });
  const set = (k: string, v: string | boolean) => {
    setSaved(false);
    setF((p) => ({ ...p, [k]: v }));
  };

  function submit() {
    setError(null);
    const amount = f.participation_agreement_amount.trim();
    if (amount && Number.isNaN(Number(amount))) {
      setError('El monto del acuerdo debe ser un número.');
      return;
    }

    const payload: InternalFieldsInput = {
      internal_notes: f.internal_notes,
      verification_notes: f.verification_notes,
      ...(isStore
        ? {
            store_condition: f.store_condition,
            product_location_in_store: f.product_location_in_store,
          }
        : {
            coi_required: f.coi_required,
            coi_named_insured: f.coi_named_insured,
            coi_status: f.coi_status as InternalFieldsInput['coi_status'],
            participation_agreement_required: f.participation_agreement_required,
            participation_agreement_payment: f.participation_agreement_payment,
            participation_agreement_amount: amount ? Number(amount) : null,
            third_party_vendors: f.third_party_vendors,
            fabrication_notes: f.fabrication_notes,
            logistics_notes: f.logistics_notes,
            asset_delivery_status: f.asset_delivery_status,
            content_creation_brief: f.content_creation_brief,
          }),
    };

    start(async () => {
      const res = await updateInternalFields(solicitud.id, payload);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error ?? 'No se pudo guardar.');
      }
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Trabajo interno CiMA</h2>
      <div className="space-y-3">
        <div>
          <label className={label}>Notas internas</label>
          <textarea rows={3} className={input} value={f.internal_notes}
            onChange={(e) => set('internal_notes', e.target.value)} />
        </div>
        <div>
          <label className={label}>
            {isStore ? 'Verificación con la tienda' : 'Verificación con el venue'}
          </label>
          <textarea rows={2} className={input} value={f.verification_notes}
            onChange={(e) => set('verification_notes', e.target.value)} />
        </div>

        {isStore ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Condición de la tienda</label>
              <input className={input} value={f.store_condition}
                onChange={(e) => set('store_condition', e.target.value)} />
            </div>
            <div>
              <label className={label}>Ubicación del producto</label>
              <input className={input} value={f.product_location_in_store}
                onChange={(e) => set('product_location_in_store', e.target.value)} />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={f.coi_required}
                    onChange={(e) => set('coi_required', e.target.checked)} />
                  Requiere COI (seguro)
                </label>
                {f.coi_required && (
                  <>
                    <input className={input} placeholder="Asegurados adicionales"
                      value={f.coi_named_insured}
                      onChange={(e) => set('coi_named_insured', e.target.value)} />
                    <select className={input} value={f.coi_status}
                      onChange={(e) => set('coi_status', e.target.value)}>
                      <option value="pending">COI pendiente</option>
                      <option value="submitted">COI enviado</option>
                      <option value="approved">COI aprobado</option>
                    </select>
                  </>
                )}
              </div>
              <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={f.participation_agreement_required}
                    onChange={(e) => set('participation_agreement_required', e.target.checked)} />
                  Acuerdo de participación
                </label>
                {f.participation_agreement_required && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={f.participation_agreement_payment}
                        onChange={(e) => set('participation_agreement_payment', e.target.checked)} />
                      CiMA gestiona el pago
                    </label>
                    <input className={input} placeholder="Monto (USD)" inputMode="decimal"
                      value={f.participation_agreement_amount}
                      onChange={(e) => set('participation_agreement_amount', e.target.value)} />
                  </>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Proveedores externos</label>
                <input className={input} value={f.third_party_vendors}
                  onChange={(e) => set('third_party_vendors', e.target.value)} />
              </div>
              <div>
                <label className={label}>Estado de entrega de assets</label>
                <input className={input} value={f.asset_delivery_status}
                  onChange={(e) => set('asset_delivery_status', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>Fabricación (elementos brandeados)</label>
              <textarea rows={2} className={input} value={f.fabrication_notes}
                onChange={(e) => set('fabrication_notes', e.target.value)} />
            </div>
            <div>
              <label className={label}>Logística (envíos, hielo, transporte)</label>
              <textarea rows={2} className={input} value={f.logistics_notes}
                onChange={(e) => set('logistics_notes', e.target.value)} />
            </div>
            <div>
              <label className={label}>Brief de contenido (foto/video)</label>
              <textarea rows={2} className={input} value={f.content_creation_brief}
                onChange={(e) => set('content_creation_brief', e.target.value)} />
            </div>
          </>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button onClick={submit} disabled={pending}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
          {saved && <span className="text-sm text-green-700">Guardado ✓</span>}
          {error && <span className="text-sm text-rose-600">{error}</span>}
        </div>
      </div>
    </section>
  );
}
