import type { Continent, Country, CountryCategory, Notoriety, WikidataId } from '../domain'

/** Identifiers of the available question templates. */
export type TemplateId =
  | 'country-capital'
  | 'capital-country'
  | 'flag-country'
  | 'silhouette-country'
  | 'coat-of-arms-country'
  | 'country-leader'
  | 'compare-area'
  | 'compare-population'

/**
 * How distractors (wrong options) are chosen:
 * - `random`: any country in the pool;
 * - `same-continent`: countries sharing a continent with the subject, when possible;
 * - `similar`: the most similar countries (bordering or nearby, or with a close
 *   value for comparisons), when possible.
 */
export type DistractorStrategy = 'random' | 'same-continent' | 'similar'

export const DISTRACTOR_STRATEGIES = [
  'random',
  'same-continent',
  'similar',
] as const satisfies readonly DistractorStrategy[]

/** Difficulty levers, set per template. */
export interface TemplateDifficulty {
  /** Number of options shown, correct one included (2–8). */
  readonly optionCount: number
  readonly distractors: DistractorStrategy
  /** Only entities with notoriety ≤ this value are used (5 = everything). */
  readonly maxNotoriety: Notoriety
  /** Seconds to answer; undefined = no timer. */
  readonly timeLimitSeconds?: number
}

export interface TemplateConfig {
  readonly enabled: boolean
  /** Relative frequency among the enabled templates (0 = never). */
  readonly weight: number
  readonly difficulty: TemplateDifficulty
}

export interface QuizFilters {
  /** Countries on at least one of these continents; empty = no filter. */
  readonly continents: readonly Continent[]
  /** Countries in one of these categories; empty = no filter. */
  readonly categories: readonly CountryCategory[]
}

/** Everything that defines a quiz. This is what the UI persists. */
export interface QuizConfig {
  readonly questionCount: number
  readonly templates: Readonly<Record<TemplateId, TemplateConfig>>
  readonly filters: QuizFilters
}

/** The data the engine works on. */
export interface QuizData {
  readonly countries: readonly Country[]
  /** Snapshot date of the country dataset (`YYYY-MM-DD`). */
  readonly snapshotDate: string
}

/** An image to show with a question or an option. */
export interface Media {
  readonly kind: 'flag' | 'silhouette' | 'coat-of-arms'
  /** Asset key (flag code, or QID for silhouettes and coats of arms). */
  readonly key: string
}

export interface Option {
  readonly id: string
  /** Italian text. For set answers, all values joined (e.g. "La Paz, Sucre"). */
  readonly label: string
  readonly media?: Media
}

export interface Question {
  /** Unique within its quiz. */
  readonly id: string
  readonly templateId: TemplateId
  /** Italian question text, e.g. "Qual è la capitale di questo paese?". */
  readonly prompt: string
  /** What the question is about, shown prominently (e.g. "Italia"). */
  readonly subject?: string
  readonly media?: Media
  readonly options: readonly Option[]
  readonly correctOptionId: string
  /** The entity the question is about (for comparisons, the anchor country). */
  readonly subjectId: WikidataId
  /** Set for questions on data that changes over time ("dati aggiornati al…"). */
  readonly snapshotDate?: string
  readonly timeLimitSeconds?: number
}

export interface Quiz {
  readonly seed: number
  readonly questions: readonly Question[]
  /**
   * How many questions were asked for. `questions` can be shorter when the
   * filters leave too few entities.
   */
  readonly requestedCount: number
}

/** The player's answer; `optionId` is null when skipped or out of time. */
export interface Answer {
  readonly questionId: string
  readonly optionId: string | null
}
