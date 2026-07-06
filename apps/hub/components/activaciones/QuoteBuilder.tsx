'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveQuoteDraft, sendQuote } from '@/modules/activaciones/actions';
import {
  formatMoney,
  quoteTotal,
  sectionSubtotal,
  type QuoteData,
} from '@/modules/activaciones/quote';
import type { SolicitudStatus } from '@cima/db';

const input =
  'rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500';

// Manual quote builder (Brief §12.2). For batches: one section per location,
// subtotal per store, grand total — the same quote is stored on every batch
// row (§6A). "Enviar cotización" transitions to quote_sent (email in Step 5).
export function QuoteBuilder({
  solicitudId,
  initial,
  initialNotes,
  status,
  isBatch,
}: {
  solicitudId: string;
  initial: QuoteData;
  initialNotes: string | null;
  status: SolicitudStatus;
  isBatch: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [sections, setSections] = useState(initial.sections);
  const [notes, setNotes] = useState(initialNotes ?? '');

  const editable = status === 'submitted' || status === 'in_review';
  const canSend = status === 'in_review';
  const total = quoteTotal(sections);

  function update(si: number, ii: number, key: 'concept' | 'amount', value: string) {
    setSaved(false);
    setSections((prev) =>
      prev.map((s, i) =>
        i !== si
          ? s
          : {
              ...s,
              items: s.items.map((item, j) =>
                j !== ii
                  ? item
                  : key === 'concept'
                    ? { ...item, concept: value }
                    : { ...item, amount: value === '' ? 0 : Number(value) }
              ),
            }
      )
    );
  }

  function addItem(si: number) {
    setSaved(false);
    setSections((prev) =>
      prev.map((s, i) => (i === si ? { ...s, items: [...s.items, { concept: '', amount: 0 }] } : s))
    );
  }

  function removeItem(si: number, ii: number) {
    setSaved(false);
    setSections((prev) =>
      prev.map((s, i) => (i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s))
    );
  }

  function save(thenSend: boolean) {
    setError(null);
    if (thenSend && !window.confirm('¿Enviar la cotización al cliente? Pasará a “Cotización enviada”.')) {
      return;
    }
    start(async () => {
      const res = await saveQuoteDraft(solicitudId, { sections, total }, notes || null);
      if (!res.ok) {
        setError(res.error ?? 'No se pudo guardar la cotización.');
        return;
      }
      if (thenSend) {
        const sent = await sendQuote(solicitudId);
        if (!sent.ok) {
          setError(sent.error ?? 'No se pudo enviar la cotización.');
          return;
        }
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Cotización</h2>
        <span className="text-sm font-semibold text-gray-900">{formatMoney(total)}</span>
      </div>

      {!editable && (
        <p className="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">
          La cotización ya fue enviada. Usa “Reabrir revisión” para editarla.
        </p>
      )}

      <div className="space-y-4">
        {sections.map((section, si) => (
          <div key={section.solicitud_id}>
            {isBatch && (
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {section.label}
                </p>
                <span className="text-xs text-gray-500">{formatMoney(sectionSubtotal(section))}</span>
              </div>
            )}
            <div className="space-y-1.5">
              {section.items.map((item, ii) => (
                <div key={ii} className="flex items-center gap-2">
                  <input
                    className={`${input} flex-1`}
                    placeholder="Concepto (p. ej. Brand ambassadors (2) × 4h)"
                    value={item.concept}
                    disabled={!editable}
                    onChange={(e) => update(si, ii, 'concept', e.target.value)}
                  />
                  <input
                    className={`${input} w-28 text-right`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item.amount === 0 ? '' : String(item.amount)}
                    disabled={!editable}
                    onChange={(e) => update(si, ii, 'amount', e.target.value)}
                  />
                  {editable && (
                    <button
                      onClick={() => removeItem(si, ii)}
                      className="text-gray-300 hover:text-rose-500"
                      aria-label="Quitar concepto"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {editable && (
                <button
                  onClick={() => addItem(si)}
                  className="text-xs font-medium text-green-700 hover:underline"
                >
                  + Agregar concepto
                </button>
              )}
            </div>
          </div>
        ))}

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
            Notas de la cotización (visibles para el cliente al enviarla)
          </label>
          <textarea
            rows={2}
            className={`${input} w-full`}
            value={notes}
            disabled={!editable}
            onChange={(e) => {
              setSaved(false);
              setNotes(e.target.value);
            }}
          />
        </div>

        {editable && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => save(false)}
              disabled={pending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Guardar borrador
            </button>
            <button
              onClick={() => save(true)}
              disabled={pending || !canSend || total <= 0}
              title={!canSend ? 'Disponible cuando la solicitud está en revisión' : undefined}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Enviar cotización
            </button>
            {saved && <span className="text-sm text-green-700">Guardado ✓</span>}
            {error && <span className="text-sm text-rose-600">{error}</span>}
          </div>
        )}
      </div>
    </section>
  );
}
