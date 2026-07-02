'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitScorecard } from '@/lib/scorecard/actions';
import {
  HARD_FILTERS,
  SCORED_QUESTIONS,
  BONUS_SIGNALS,
  MAX_SCORE,
  verdictForScore,
  VERDICT_META,
} from '@/lib/scorecard/questions';
import {
  allHardFiltersPass,
  anyHardFilterFails,
  computeTotal,
  scoresComplete,
  type ScorecardPayload,
  type ScorecardDecision,
} from '@/lib/scorecard/scoring';

const SCORE_OPTIONS = [
  { value: 1, label: '1 · Débil' },
  { value: 2, label: '2 · Aceptable' },
  { value: 3, label: '3 · Fuerte' },
];

export function ScorecardForm({
  candidateId,
  candidateName,
  initial,
}: {
  candidateId: string;
  candidateName: string;
  initial: ScorecardPayload;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [p, setP] = useState<ScorecardPayload>(initial);

  const hardPass = allHardFiltersPass(p);
  const hardFail = anyHardFilterFails(p);
  const total = computeTotal(p);
  const complete = scoresComplete(p);
  const verdict = verdictForScore(total);

  function setHardFilter(field: keyof ScorecardPayload['hardFilters'], val: boolean) {
    setP((prev) => ({ ...prev, hardFilters: { ...prev.hardFilters, [field]: val } }));
  }
  function setScore(key: string, n: number) {
    setP((prev) => ({ ...prev, scores: { ...prev.scores, [key]: n } }));
  }
  function setNote(key: string, text: string) {
    setP((prev) => ({ ...prev, notes: { ...prev.notes, [key]: text } }));
  }
  function toggleBonus(field: keyof ScorecardPayload['bonus']) {
    setP((prev) => ({ ...prev, bonus: { ...prev.bonus, [field]: !prev.bonus[field] } }));
  }

  function submit(decision: ScorecardDecision, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const res = await submitScorecard(candidateId, p, decision);
      if (res.ok) router.push(`/dashboard/candidates/${candidateId}`);
      else setError(res.error ?? 'Algo salió mal');
    });
  }

  return (
    <div className="space-y-5">
      {/* Step 1 — Hard filters */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Paso 1 · Filtros obligatorios
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Si alguno es «No», el candidato no avanza y se envía el correo de rechazo.
        </p>
        <ul className="mt-3 space-y-3">
          {HARD_FILTERS.map((f) => (
            <li key={f.key} className="flex items-start justify-between gap-4">
              <span className="text-sm text-gray-700">{f.question}</span>
              <div className="flex shrink-0 gap-1">
                <ToggleButton
                  active={p.hardFilters[f.field] === true}
                  activeClass="bg-green-600 text-white"
                  onClick={() => setHardFilter(f.field, true)}
                >
                  Sí
                </ToggleButton>
                <ToggleButton
                  active={p.hardFilters[f.field] === false}
                  activeClass="bg-rose-600 text-white"
                  onClick={() => setHardFilter(f.field, false)}
                >
                  No
                </ToggleButton>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Hard filter failure → disqualify */}
      {hardFail && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-medium text-rose-800">
            {candidateName} no cumple un filtro obligatorio. La sección de puntaje no aplica.
          </p>
          <button
            onClick={() =>
              submit(
                'not_fit',
                `¿Marcar a ${candidateName} como NO FIT? Se enviará el correo de rechazo.`
              )
            }
            disabled={pending}
            className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Marcar como no fit y enviar correo
          </button>
        </section>
      )}

      {/* Hint while hard filters incomplete and none failed */}
      {!hardPass && !hardFail && (
        <p className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-500">
          Responde los cuatro filtros obligatorios con «Sí» para acceder al puntaje.
        </p>
      )}

      {/* Step 2 — Scored questions (gated behind passing hard filters) */}
      {hardPass && (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Paso 2 · Preguntas con puntaje
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {total}
                  <span className="text-sm font-normal text-gray-400"> / {MAX_SCORE}</span>
                </span>
                {complete && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VERDICT_META[verdict].badgeClass}`}
                  >
                    {VERDICT_META[verdict].label}
                  </span>
                )}
              </div>
            </div>

            <ul className="mt-4 space-y-5">
              {SCORED_QUESTIONS.map((q, i) => (
                <li key={q.key} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {i + 1}. {q.category}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-700">{q.question}</p>
                  <p className="mt-1 text-xs italic text-gray-400">Escucha por: {q.listenFor}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {SCORE_OPTIONS.map((opt) => (
                      <ToggleButton
                        key={opt.value}
                        active={p.scores[q.key] === opt.value}
                        activeClass="bg-blue-600 text-white"
                        onClick={() => setScore(q.key, opt.value)}
                      >
                        {opt.label}
                      </ToggleButton>
                    ))}
                  </div>
                  <input
                    value={p.notes[q.key] ?? ''}
                    onChange={(e) => setNote(q.key, e.target.value)}
                    placeholder="Nota (opcional)"
                    className="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </li>
              ))}
            </ul>
          </section>

          {/* Step 3 — Bonus signals */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Paso 3 · Señales adicionales
            </h2>
            <p className="mt-1 text-xs text-gray-400">No suman puntaje; ayudan en casos límite.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {BONUS_SIGNALS.map((b) => (
                <label
                  key={b.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={p.bonus[b.field]}
                    onChange={() => toggleBonus(b.field)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {b.label}
                </label>
              ))}
            </div>
          </section>
        </>
      )}

      {/* General notes */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Notas generales</h2>
        <textarea
          value={p.generalNotes}
          onChange={(e) => setP((prev) => ({ ...prev, generalNotes: e.target.value }))}
          rows={3}
          placeholder="Resumen de la llamada…"
          className="mt-2 w-full resize-y rounded-lg border border-gray-200 p-2.5 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </section>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* Decision actions */}
      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-gray-200 bg-gray-50 py-4">
        <button
          onClick={() => submit('draft')}
          disabled={pending}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Guardar borrador
        </button>
        {hardPass && (
          <>
            <button
              onClick={() =>
                submit(
                  'fit',
                  `¿Avanzar a ${candidateName} con Julia? Se enviará el correo para agendar.`
                )
              }
              disabled={pending || !complete}
              title={!complete ? 'Completa las 7 preguntas' : undefined}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Avanzar con Julia (fit)
            </button>
            <button
              onClick={() =>
                submit(
                  'not_fit',
                  `¿Marcar a ${candidateName} como NO FIT? Se enviará el correo de rechazo.`
                )
              }
              disabled={pending || !complete}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              No es un fit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  activeClass,
  onClick,
  children,
}: {
  active: boolean;
  activeClass: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? activeClass : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
