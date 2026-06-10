// Canonical vetting-scorecard definition (Brief §8). Shared by the profile's
// scorecard breakdown (Step 4) and the scorecard entry UI (Step 5), so the
// questions, ordering, and scoring stay in one place.
import type { Database } from '@/lib/database.types';

type Candidate = Database['public']['Tables']['candidates']['Row'];

// ---- Step 1: Hard filters (any false ⇒ rejected_hm) -----------------------
// `field` maps to the boolean column on candidates.
export interface HardFilter {
  key: string;
  field: 'has_vehicle' | 'work_authorized' | 'available_mf' | 'works_independently';
  question: string;
}

export const HARD_FILTERS: HardFilter[] = [
  {
    key: 'vehicle',
    field: 'has_vehicle',
    question: '¿Tienes licencia de conducir válida y un vehículo personal confiable?',
  },
  {
    key: 'work_authorized',
    // Verbal confirmation only — never document-verified in the pipeline (Brief §14).
    field: 'work_authorized',
    question: '¿Estás autorizado/a para trabajar en los Estados Unidos? (confirmación verbal)',
  },
  {
    key: 'available_mf',
    field: 'available_mf',
    question: '¿Tienes disponibilidad de lunes a viernes, tiempo completo (40 hrs/semana)?',
  },
  {
    key: 'works_independently',
    field: 'works_independently',
    question: '¿Te sientes cómodo/a trabajando de forma independiente y manejando tu propia ruta diaria?',
  },
];

// ---- Step 2: Scored questions (1 = weak, 2 = acceptable, 3 = strong) -------
export interface ScoredQuestion {
  key: string;
  category: string;
  question: string;
  listenFor: string;
}

export const SCORED_QUESTIONS: ScoredQuestion[] = [
  {
    key: 'self_management',
    category: 'Autogestión y confiabilidad',
    question: 'Cuéntame de una vez que tuviste que manejar tu propio horario o carga de trabajo sin que alguien te supervisara. ¿Cómo te mantuviste al día?',
    listenFor: 'Ejemplo específico, autodisciplina, planeación proactiva. Vago = 1.',
  },
  {
    key: 'problem_solving',
    category: 'Resolución de problemas',
    question: 'Describe una situación en la que algo salió mal en el trabajo y tuviste que resolverlo por tu cuenta. ¿Qué hiciste?',
    listenFor: 'Toma de responsabilidad, pensamiento creativo, no se paralizó. Culpar a otros = 1.',
  },
  {
    key: 'people_sales',
    category: 'Orientación a las personas y ventas',
    question: 'Este rol implica visitar varias tiendas al día y construir relaciones con los gerentes. ¿Cómo generas confianza con personas que acabas de conocer?',
    listenFor: 'Calidez, confianza, tácticas específicas. Respuesta genérica = 1.',
  },
  {
    key: 'adaptability',
    category: 'Adaptabilidad',
    question: 'Las rutas y prioridades pueden cambiar de una semana a otra. ¿Cómo manejas los cambios de último momento en tus planes?',
    listenFor: 'Flexibilidad, enfoque positivo. Resistencia al cambio = 1.',
  },
  {
    key: 'reliability',
    category: 'Confiabilidad y compromiso',
    question: '¿Qué significa para ti ser confiable, y me puedes dar un ejemplo de cómo lo has demostrado en un trabajo anterior?',
    listenFor: 'Ejemplo específico, responsabilidad. "Siempre soy puntual" sin ejemplo = 1.',
  },
  {
    key: 'initiative',
    category: 'Iniciativa',
    question: 'Si notaras que un producto no está bien colocado en una tienda y nadie te pidió arreglarlo, ¿qué harías?',
    listenFor: 'Toma iniciativa sin que se lo pidan. "Esperar instrucciones" = 1.',
  },
  {
    key: 'merchandising',
    category: 'Instinto de marca y merchandising',
    question: 'Explícame cómo representarías una marca dentro de una tienda que nunca has visitado.',
    listenFor: 'Pensamiento estructurado, atención al detalle. Vago = 1.',
  },
];

export const MAX_SCORE = SCORED_QUESTIONS.length * 3; // 21

// ---- Step 3: Bonus signals (not scored) -----------------------------------
export interface BonusSignal {
  key: string;
  field: 'bilingual' | 'prior_experience' | 'app_comfortable';
  label: string;
}

export const BONUS_SIGNALS: BonusSignal[] = [
  { key: 'bilingual', field: 'bilingual', label: 'Bilingüe inglés/español' },
  { key: 'prior_experience', field: 'prior_experience', label: 'Experiencia previa en merchandising/retail/CPG/rutas' },
  { key: 'app_comfortable', field: 'app_comfortable', label: 'Cómodo/a usando app móvil para reportes diarios' },
];

// ---- Verdict logic (Brief §8) ---------------------------------------------
export type Verdict = 'strong_yes' | 'borderline' | 'not_fit';

export function verdictForScore(score: number): Verdict {
  if (score >= 17) return 'strong_yes';
  if (score >= 12) return 'borderline';
  return 'not_fit';
}

export const VERDICT_META: Record<Verdict, { label: string; badgeClass: string }> = {
  strong_yes: { label: 'Sí rotundo — avanzar con Julia', badgeClass: 'bg-green-100 text-green-800' },
  borderline: { label: 'En el límite — usar criterio', badgeClass: 'bg-amber-100 text-amber-800' },
  not_fit:    { label: 'No es un fit — no avanzar', badgeClass: 'bg-rose-100 text-rose-800' },
};

/** True when every hard filter is explicitly true. Null/false ⇒ not passing. */
export function hardFiltersPass(candidate: Candidate): boolean {
  return HARD_FILTERS.every((f) => candidate[f.field] === true);
}
