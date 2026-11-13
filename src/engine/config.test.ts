import { describe, expect, it } from 'vitest'
import { defaultQuizConfig, normalizeQuizConfig } from './config'

describe('normalizeQuizConfig', () => {
  it('returns the defaults for anything that is not an object', () => {
    for (const value of [undefined, null, 42, 'config', []]) {
      expect(normalizeQuizConfig(value)).toEqual(defaultQuizConfig())
    }
  })

  it('round-trips a valid configuration unchanged', () => {
    const config = defaultQuizConfig()
    const custom = {
      ...config,
      questionCount: 25,
      filters: { continents: ['africa', 'asia'], categories: ['un-member'] },
      templates: {
        ...config.templates,
        'flag-country': {
          enabled: true,
          weight: 2,
          difficulty: {
            optionCount: 6,
            distractors: 'similar',
            maxNotoriety: 5,
            timeLimitSeconds: 15,
          },
        },
      },
    }
    expect(normalizeQuizConfig(JSON.parse(JSON.stringify(custom)))).toEqual(custom)
  })

  it('clamps numbers and drops invalid values', () => {
    const config = normalizeQuizConfig({
      questionCount: 1000,
      filters: { continents: ['europe', 'atlantis'], categories: 'all' },
      templates: {
        'country-capital': {
          enabled: 'yes',
          weight: -3,
          difficulty: { optionCount: 1, distractors: 'hard', maxNotoriety: 9, timeLimitSeconds: 0 },
        },
      },
    })
    expect(config.questionCount).toBe(100)
    expect(config.filters).toEqual({ continents: ['europe'], categories: [] })
    const capital = config.templates['country-capital']
    expect(capital.enabled).toBe(true) // fallback to the default
    expect(capital.weight).toBe(0)
    expect(capital.difficulty).toEqual({
      optionCount: 2,
      distractors: 'same-continent',
      maxNotoriety: 3,
    })
  })

  it('fills in templates missing from an older saved configuration', () => {
    const config = normalizeQuizConfig({ questionCount: 5, templates: {} })
    expect(config.templates).toEqual(defaultQuizConfig().templates)
  })
})
