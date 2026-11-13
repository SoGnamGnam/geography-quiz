import { CONTINENTS, COUNTRY_CATEGORIES, NOTORIETY_LEVELS, type Notoriety } from '../domain'
import {
  DISTRACTOR_STRATEGIES,
  type DistractorStrategy,
  type QuizConfig,
  type TemplateConfig,
  type TemplateId,
} from './types'

export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 8
export const MIN_QUESTIONS = 1
export const MAX_QUESTIONS = 100
export const MAX_WEIGHT = 10
export const MAX_TIME_LIMIT = 300

const standard: TemplateConfig = {
  enabled: true,
  weight: 1,
  difficulty: { optionCount: 4, distractors: 'same-continent', maxNotoriety: 3 },
}

/** The configuration a new player starts with. */
export function defaultQuizConfig(): QuizConfig {
  const templates: Record<TemplateId, TemplateConfig> = {
    'country-capital': standard,
    'capital-country': standard,
    'flag-country': standard,
    'silhouette-country': standard,
    'coat-of-arms-country': { ...standard, enabled: false },
    'country-leader': { ...standard, enabled: false },
    'compare-area': { ...standard, weight: 0.5 },
    'compare-population': { ...standard, weight: 0.5 },
  }
  return { questionCount: 10, templates, filters: { continents: [], categories: [] } }
}

// ---------------------------------------------------------------------------
// Normalization of untrusted input (e.g. a configuration read back from
// localStorage, possibly written by an older version of the app).

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function number(v: unknown, fallback: number, min: number, max: number, integer = true): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  const n = integer ? Math.round(v) : v
  return Math.min(max, Math.max(min, n))
}

function oneOf<T>(v: unknown, values: readonly T[], fallback: T): T {
  return values.includes(v as T) ? (v as T) : fallback
}

function subsetOf<T>(v: unknown, values: readonly T[]): T[] {
  if (!Array.isArray(v)) return []
  return values.filter((value) => v.includes(value))
}

function normalizeTemplate(v: unknown, fallback: TemplateConfig): TemplateConfig {
  if (!isObject(v)) return fallback
  const d = isObject(v.difficulty) ? v.difficulty : {}
  const timeLimit =
    d.timeLimitSeconds === undefined ? undefined : number(d.timeLimitSeconds, 0, 0, MAX_TIME_LIMIT)
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : fallback.enabled,
    weight: number(v.weight, fallback.weight, 0, MAX_WEIGHT, false),
    difficulty: {
      optionCount: number(d.optionCount, fallback.difficulty.optionCount, MIN_OPTIONS, MAX_OPTIONS),
      distractors: oneOf<DistractorStrategy>(
        d.distractors,
        DISTRACTOR_STRATEGIES,
        fallback.difficulty.distractors,
      ),
      maxNotoriety: oneOf<Notoriety>(
        d.maxNotoriety,
        NOTORIETY_LEVELS,
        fallback.difficulty.maxNotoriety,
      ),
      ...(timeLimit ? { timeLimitSeconds: timeLimit } : {}),
    },
  }
}

/**
 * Turns any value into a valid configuration: known fields are kept (clamped
 * to their valid range), unknown or invalid ones fall back to the defaults,
 * and templates added since the value was saved get their default settings.
 */
export function normalizeQuizConfig(value: unknown): QuizConfig {
  const defaults = defaultQuizConfig()
  if (!isObject(value)) return defaults
  const templates = isObject(value.templates) ? value.templates : {}
  const filters = isObject(value.filters) ? value.filters : {}
  return {
    questionCount: number(
      value.questionCount,
      defaults.questionCount,
      MIN_QUESTIONS,
      MAX_QUESTIONS,
    ),
    templates: Object.fromEntries(
      Object.entries(defaults.templates).map(([id, fallback]) => [
        id,
        normalizeTemplate(templates[id], fallback),
      ]),
    ) as Record<TemplateId, TemplateConfig>,
    filters: {
      continents: subsetOf(filters.continents, CONTINENTS),
      categories: subsetOf(filters.categories, COUNTRY_CATEGORIES),
    },
  }
}
