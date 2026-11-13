// Builds a quiz from a configuration: picks a template for each question by
// weight, a subject from that template's pool, and distractors according to
// the template's difficulty.

import type { Country, WikidataId } from '../domain'
import { MAX_OPTIONS, MAX_QUESTIONS, MIN_OPTIONS } from './config'
import { orderCandidates } from './distractors'
import { applyFilters, withinNotoriety } from './filters'
import { createRng, type Rng } from './rng'
import { TEMPLATES, TEMPLATE_IDS, type QuestionTemplate } from './templates'
import type {
  Option,
  Question,
  Quiz,
  QuizConfig,
  QuizData,
  TemplateConfig,
  TemplateId,
} from './types'

const OPTION_IDS = 'abcdefgh'

interface ActiveTemplate {
  readonly template: QuestionTemplate
  readonly config: TemplateConfig
  readonly optionCount: number
  /** Subjects not used yet, within the notoriety threshold. */
  readonly subjects: Country[]
  /** Candidates for distractors, within the notoriety threshold. */
  readonly pool: readonly Country[]
  /** Fallback candidates when the pool is too small: same filters, any notoriety. */
  readonly fallbackPool: readonly Country[]
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)))

function activate(id: TemplateId, config: QuizConfig, filtered: readonly Country[]) {
  const templateConfig = config.templates[id]
  if (!templateConfig.enabled || templateConfig.weight <= 0) return undefined
  const template = TEMPLATES[id]
  const applicable = filtered.filter((c) => template.isApplicable(c))
  const pool = withinNotoriety(applicable, templateConfig.difficulty.maxNotoriety)
  if (pool.length === 0) return undefined
  return {
    template,
    config: templateConfig,
    optionCount: clamp(templateConfig.difficulty.optionCount, MIN_OPTIONS, MAX_OPTIONS),
    subjects: [...pool],
    pool,
    fallbackPool: applicable,
  } satisfies ActiveTemplate
}

function buildQuestion(
  active: ActiveTemplate,
  subject: Country,
  index: number,
  data: QuizData,
  rng: Rng,
): Question | undefined {
  const { template, config, optionCount } = active
  const strategy = config.difficulty.distractors
  const order = (pool: readonly Country[]) =>
    orderCandidates(subject, pool, strategy, rng, template.similarity, optionCount - 1)

  const draft =
    template.build(subject, order(active.pool), optionCount) ??
    template.build(subject, order(active.fallbackPool), optionCount)
  if (!draft) return undefined

  const shuffled = rng.shuffle([draft.correct, ...draft.distractors])
  const options: Option[] = shuffled.map((option, i) => ({
    id: OPTION_IDS[i]!,
    label: option.label,
    ...(option.media ? { media: option.media } : {}),
  }))
  const correctOptionId = options[shuffled.indexOf(draft.correct)]!.id

  return {
    id: String(index + 1),
    templateId: template.id,
    prompt: draft.prompt,
    ...(draft.subject !== undefined ? { subject: draft.subject } : {}),
    ...(draft.media ? { media: draft.media } : {}),
    options,
    correctOptionId,
    subjectId: subject.id,
    ...(template.timeSensitive ? { snapshotDate: data.snapshotDate } : {}),
    ...(config.difficulty.timeLimitSeconds
      ? { timeLimitSeconds: config.difficulty.timeLimitSeconds }
      : {}),
  }
}

/**
 * Generates a quiz. The same data, configuration and seed always give the
 * same quiz. A subject is never asked twice with the same template, and the
 * same country is not the subject of two consecutive questions when it can be
 * avoided. The quiz is shorter than requested when the filters leave too few
 * subjects.
 */
export function generateQuiz(data: QuizData, config: QuizConfig, seed: number): Quiz {
  const rng = createRng(seed)
  const requestedCount = clamp(config.questionCount, 1, MAX_QUESTIONS)
  const filtered = applyFilters(data.countries, config.filters)

  const active: ActiveTemplate[] = []
  for (const id of TEMPLATE_IDS) {
    const template = activate(id, config, filtered)
    if (template) active.push(template)
  }

  const questions: Question[] = []
  let previousSubject: WikidataId | undefined

  while (questions.length < requestedCount && active.length > 0) {
    const index = rng.weightedIndex(active.map((a) => a.config.weight))
    const current = active[index]!

    // Prefer a subject different from the previous question's.
    const choices = current.subjects.filter((c) => c.id !== previousSubject)
    const subject = rng.pick(choices.length > 0 ? choices : current.subjects)
    current.subjects.splice(current.subjects.indexOf(subject), 1)

    const question = buildQuestion(current, subject, questions.length, data, rng)
    if (question) {
      questions.push(question)
      previousSubject = subject.id
    }
    if (current.subjects.length === 0) active.splice(index, 1)
  }

  return { seed, questions, requestedCount }
}
