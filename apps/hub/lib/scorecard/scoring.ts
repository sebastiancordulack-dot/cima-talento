// Scorecard payload shape + pure scoring/validation helpers (Brief §8).
// Shared by the entry form (client) and the submit action (server), so the
// rules live in one place and the server can recompute authoritatively.
import {
  HARD_FILTERS,
  SCORED_QUESTIONS,
  BONUS_SIGNALS,
  type HardFilter,
  type BonusSignal,
} from '@/lib/scorecard/questions';

export type HardFilterField = HardFilter['field'];
export type BonusField = BonusSignal['field'];

/** What the HM enters on the scorecard. */
export interface ScorecardPayload {
  hardFilters: Record<HardFilterField, boolean | null>;
  scores: Record<string, number | null>; // question key → 1..3
  notes: Record<string, string>; // question key → optional note
  bonus: Record<BonusField, boolean>;
  generalNotes: string;
}

/** HM's decision when submitting. `draft` saves without sending any email. */
export type ScorecardDecision = 'draft' | 'fit' | 'not_fit';

export function emptyPayload(): ScorecardPayload {
  return {
    hardFilters: Object.fromEntries(HARD_FILTERS.map((f) => [f.field, null])) as ScorecardPayload['hardFilters'],
    scores: Object.fromEntries(SCORED_QUESTIONS.map((q) => [q.key, null])),
    notes: Object.fromEntries(SCORED_QUESTIONS.map((q) => [q.key, ''])),
    bonus: Object.fromEntries(BONUS_SIGNALS.map((b) => [b.field, false])) as ScorecardPayload['bonus'],
    generalNotes: '',
  };
}

/** Every hard filter explicitly answered "yes". */
export function allHardFiltersPass(p: ScorecardPayload): boolean {
  return HARD_FILTERS.every((f) => p.hardFilters[f.field] === true);
}

/** Any hard filter explicitly answered "no" (an immediate disqualifier). */
export function anyHardFilterFails(p: ScorecardPayload): boolean {
  return HARD_FILTERS.some((f) => p.hardFilters[f.field] === false);
}

/** True once every hard filter has a yes/no answer. */
export function hardFiltersComplete(p: ScorecardPayload): boolean {
  return HARD_FILTERS.every((f) => p.hardFilters[f.field] !== null);
}

/** Sum of the seven scored questions (counts only valid 1–3 answers). */
export function computeTotal(p: ScorecardPayload): number {
  return SCORED_QUESTIONS.reduce((sum, q) => {
    const v = p.scores[q.key];
    return sum + (typeof v === 'number' && v >= 1 && v <= 3 ? v : 0);
  }, 0);
}

/** True once all seven questions have a 1–3 score. */
export function scoresComplete(p: ScorecardPayload): boolean {
  return SCORED_QUESTIONS.every((q) => {
    const v = p.scores[q.key];
    return typeof v === 'number' && v >= 1 && v <= 3;
  });
}

/** jsonb written to candidates.scorecard_data — per-question { score, note }. */
export function buildScorecardData(p: ScorecardPayload): Record<string, { score: number | null; note: string }> {
  return Object.fromEntries(
    SCORED_QUESTIONS.map((q) => [q.key, { score: p.scores[q.key], note: p.notes[q.key] ?? '' }])
  );
}

export interface ValidationError {
  message: string;
}

/**
 * Server-side guard before applying a decision (Brief §14):
 *  • a hard-filter failure may only resolve to `not_fit`
 *  • advancing (`fit`) requires every hard filter to pass
 *  • a fit/not_fit decision with all hard filters passing requires complete scores
 */
export function validateDecision(
  p: ScorecardPayload,
  decision: ScorecardDecision
): ValidationError | null {
  if (!hardFiltersComplete(p) && decision !== 'draft') {
    return { message: 'Responde todos los filtros obligatorios antes de decidir.' };
  }
  if (anyHardFilterFails(p)) {
    if (decision === 'fit') {
      return { message: 'No se puede avanzar a un candidato que no cumple un filtro obligatorio.' };
    }
    return null; // not_fit / draft are fine; scores not required
  }
  if (decision === 'fit' || decision === 'not_fit') {
    if (!allHardFiltersPass(p)) {
      return { message: 'Todos los filtros obligatorios deben cumplirse para tomar una decisión.' };
    }
    if (!scoresComplete(p)) {
      return { message: 'Completa el puntaje de las 7 preguntas antes de decidir.' };
    }
  }
  return null;
}
