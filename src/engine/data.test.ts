// Runs the engine on the real dataset with many configurations and checks the
// invariants every generated quiz must satisfy.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { sameRefSet, type CountryDataset, type Notoriety } from '../domain'
import { defaultQuizConfig } from './config'
import { generateQuiz } from './generator'
import { createRng } from './rng'
import { DISTRACTOR_STRATEGIES, type QuizConfig, type QuizData } from './types'
import { TEMPLATE_IDS, setOption } from './templates'

const dataset = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', 'data', 'countries.json'), 'utf8'),
) as CountryDataset
const data: QuizData = { countries: dataset.entities, snapshotDate: dataset.snapshotDate }
const byId = new Map(data.countries.map((c) => [c.id, c]))

function randomConfig(seed: number): QuizConfig {
  const rng = createRng(seed)
  const base = defaultQuizConfig()
  const templates = Object.fromEntries(
    TEMPLATE_IDS.map((id) => [
      id,
      {
        enabled: rng.next() < 0.7,
        weight: rng.int(3) + 1,
        difficulty: {
          optionCount: rng.int(7) + 2,
          distractors: rng.pick(DISTRACTOR_STRATEGIES),
          maxNotoriety: (rng.int(5) + 1) as Notoriety,
        },
      },
    ]),
  ) as QuizConfig['templates']
  return { ...base, questionCount: 30, templates }
}

describe('engine on the real dataset', () => {
  it('generates valid quizzes for many random configurations', () => {
    for (let seed = 0; seed < 200; seed++) {
      const config = randomConfig(seed)
      const quiz = generateQuiz(data, config, seed)
      const anyEnabled = TEMPLATE_IDS.some((id) => config.templates[id].enabled)
      if (anyEnabled) expect(quiz.questions.length).toBeGreaterThan(0)

      for (const q of quiz.questions) {
        const difficulty = config.templates[q.templateId].difficulty
        expect(q.options).toHaveLength(difficulty.optionCount)
        expect(new Set(q.options.map((o) => o.label)).size).toBe(q.options.length)
        const correct = q.options.find((o) => o.id === q.correctOptionId)
        expect(correct).toBeDefined()

        const subject = byId.get(q.subjectId)!
        expect(subject.notoriety).toBeLessThanOrEqual(difficulty.maxNotoriety)
        if (q.templateId === 'country-capital') {
          expect(correct!.label).toBe(setOption(subject.capitals).label)
        }
        if (q.templateId === 'country-leader') {
          expect(correct!.label).toBe(setOption(subject.leaders).label)
        }
        if (q.templateId === 'flag-country') expect(correct!.label).toBe(subject.name)
      }
    }
  })

  it('answers South Africa’s capital with all three cities', () => {
    const southAfrica = data.countries.find((c) => c.id === 'Q258')!
    expect(southAfrica.capitals).toHaveLength(3)
    const config: QuizConfig = {
      ...defaultQuizConfig(),
      questionCount: 100,
      filters: { continents: ['africa'], categories: ['un-member'] },
    }
    const onlyCapitals = Object.fromEntries(
      TEMPLATE_IDS.map((id) => [
        id,
        {
          ...config.templates[id],
          enabled: id === 'country-capital',
          difficulty: { ...config.templates[id].difficulty, maxNotoriety: 5 as const },
        },
      ]),
    ) as QuizConfig['templates']
    const quiz = generateQuiz(data, { ...config, templates: onlyCapitals }, 1)
    const question = quiz.questions.find((q) => q.subjectId === 'Q258')!
    const correct = question.options.find((o) => o.id === question.correctOptionId)!
    expect(correct.label.split(', ')).toHaveLength(3)
    expect(
      sameRefSet(
        southAfrica.capitals,
        southAfrica.capitals.filter((c) => correct.label.includes(c.name)),
      ),
    ).toBe(true)
  })
})
