import type { TemplateId, QuizConfig, TemplateConfig } from './types'

export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 8
export const MAX_QUESTIONS = 100

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
