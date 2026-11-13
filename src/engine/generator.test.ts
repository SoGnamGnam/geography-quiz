import { describe, expect, it } from 'vitest'
import { defaultQuizConfig } from './config'
import { DATA, byId } from './fixtures'
import { generateQuiz } from './generator'
import { TEMPLATE_IDS } from './templates'
import type { QuizConfig, TemplateConfig, TemplateId } from './types'

/** A config with only the given templates enabled. */
function only(
  ids: TemplateId[],
  overrides: Partial<TemplateConfig['difficulty']> = {},
  rest: Partial<QuizConfig> = {},
): QuizConfig {
  const base = defaultQuizConfig()
  const templates = Object.fromEntries(
    TEMPLATE_IDS.map((id) => [
      id,
      {
        enabled: ids.includes(id),
        weight: 1,
        difficulty: { ...base.templates[id].difficulty, maxNotoriety: 5 as const, ...overrides },
      },
    ]),
  ) as QuizConfig['templates']
  return { ...base, templates, ...rest }
}

describe('generateQuiz', () => {
  it('is reproducible from the seed', () => {
    const config = defaultQuizConfig()
    expect(generateQuiz(DATA, config, 123)).toEqual(generateQuiz(DATA, config, 123))
    expect(generateQuiz(DATA, config, 123)).not.toEqual(generateQuiz(DATA, config, 124))
  })

  it('generates the requested number of questions with unique ids', () => {
    const quiz = generateQuiz(DATA, { ...defaultQuizConfig(), questionCount: 15 }, 1)
    expect(quiz.questions).toHaveLength(15)
    expect(quiz.requestedCount).toBe(15)
    expect(new Set(quiz.questions.map((q) => q.id)).size).toBe(15)
  })

  it('every question has its correct option among the options', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const q of generateQuiz(DATA, only(TEMPLATE_IDS, {}, { questionCount: 20 }), seed)
        .questions) {
        expect(q.options.map((o) => o.id)).toContain(q.correctOptionId)
        expect(new Set(q.options.map((o) => o.label)).size).toBe(q.options.length)
      }
    }
  })

  it('never asks the same subject twice with the same template', () => {
    const quiz = generateQuiz(DATA, only(['country-capital'], {}, { questionCount: 50 }), 5)
    const subjects = quiz.questions.map((q) => q.subjectId)
    expect(new Set(subjects).size).toBe(subjects.length)
  })

  it('stops early when the pool runs out, reporting the requested count', () => {
    const quiz = generateQuiz(DATA, only(['country-capital'], {}, { questionCount: 100 }), 5)
    expect(quiz.questions).toHaveLength(DATA.countries.length)
    expect(quiz.requestedCount).toBe(100)
  })

  it('uses only enabled templates with a positive weight', () => {
    const config = only(['flag-country', 'compare-area'])
    const weighted: QuizConfig = {
      ...config,
      questionCount: 30,
      templates: {
        ...config.templates,
        'compare-area': { ...config.templates['compare-area'], weight: 0 },
      },
    }
    const ids = new Set(generateQuiz(DATA, weighted, 9).questions.map((q) => q.templateId))
    expect([...ids]).toEqual(['flag-country'])
  })

  it('respects the continent filter for subjects and options', () => {
    const config = only(
      ['capital-country'],
      {},
      {
        questionCount: 10,
        filters: { continents: ['africa'], categories: [] },
      },
    )
    const african = new Set(['Sudafrica', 'Egitto', 'Kenya', 'Ciad'])
    const quiz = generateQuiz(DATA, config, 3)
    expect(quiz.questions).toHaveLength(4)
    for (const q of quiz.questions) {
      for (const option of q.options) expect(african.has(option.label)).toBe(true)
    }
  })

  it('respects the notoriety threshold for subjects', () => {
    const quiz = generateQuiz(
      DATA,
      only(['country-capital'], { maxNotoriety: 1 }, { questionCount: 50 }),
      2,
    )
    for (const q of quiz.questions) expect(byId(q.subjectId).notoriety).toBe(1)
  })

  it('falls back to less known distractors when the pool is too small', () => {
    // Only African countries with notoriety 1 (Sudafrica, Egitto): not enough
    // for 4 options, so the other African countries fill in.
    const config = only(
      ['country-capital'],
      { maxNotoriety: 1, optionCount: 4 },
      {
        filters: { continents: ['africa'], categories: [] },
      },
    )
    const quiz = generateQuiz(DATA, config, 1)
    expect(quiz.questions).toHaveLength(2)
    for (const q of quiz.questions) expect(q.options).toHaveLength(4)
  })

  it('sets the snapshot date only on time-sensitive questions, and the timer when configured', () => {
    const quiz = generateQuiz(
      DATA,
      only(['country-capital', 'flag-country'], { timeLimitSeconds: 15 }, { questionCount: 20 }),
      4,
    )
    for (const q of quiz.questions) {
      expect(q.snapshotDate).toBe(q.templateId === 'country-capital' ? '2026-11-01' : undefined)
      expect(q.timeLimitSeconds).toBe(15)
    }
  })

  it('clamps the option count and the question count', () => {
    const quiz = generateQuiz(
      DATA,
      only(['country-capital'], { optionCount: 50 }, { questionCount: 0 }),
      1,
    )
    expect(quiz.questions).toHaveLength(1)
    expect(quiz.questions[0]!.options).toHaveLength(8)
  })

  it('returns an empty quiz when nothing matches', () => {
    const config = only(
      ['country-capital'],
      {},
      { filters: { continents: ['antarctica'], categories: [] } },
    )
    expect(generateQuiz(DATA, config, 1).questions).toEqual([])
  })

  it('avoids the same subject in consecutive questions', () => {
    const quiz = generateQuiz(
      DATA,
      only(['country-capital', 'flag-country'], {}, { questionCount: 30 }),
      8,
    )
    for (let i = 1; i < quiz.questions.length; i++) {
      expect(quiz.questions[i]!.subjectId).not.toBe(quiz.questions[i - 1]!.subjectId)
    }
  })
})
