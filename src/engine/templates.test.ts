import { describe, expect, it } from 'vitest'
import type { Country } from '../domain'
import { orderCandidates } from './distractors'
import { COUNTRIES, byId } from './fixtures'
import { createRng } from './rng'
import { TEMPLATES, setOption, takeDistinct, type QuestionDraft } from './templates'
import type { TemplateId } from './types'

function build(id: TemplateId, subject: Country, optionCount = 4, seed = 1): QuestionDraft {
  const template = TEMPLATES[id]
  const pool = COUNTRIES.filter((c) => template.isApplicable(c))
  const candidates = orderCandidates(subject, pool, 'random', createRng(seed), template.similarity)
  const draft = template.build(subject, candidates, optionCount)
  if (!draft) throw new Error('no draft')
  return draft
}

function allOptions(draft: QuestionDraft) {
  return [draft.correct, ...draft.distractors]
}

describe('setOption', () => {
  it('joins names alphabetically and keys by sorted ids', () => {
    const option = setOption(byId('Q258').capitals)
    expect(option.label).toBe('Bloemfontein, Città del Capo, Pretoria')
    expect(option.key).toBe('Q37701|Q3926|Q5465')
  })
})

describe('takeDistinct', () => {
  it('skips options equal to the correct one or to each other', () => {
    const correct = { key: 'x', label: 'X' }
    const options = takeDistinct(correct, COUNTRIES, 2, (c) =>
      c.id === 'Q38' ? { key: 'x', label: 'X' } : { key: 'same', label: c.name },
    )
    expect(options).toBeUndefined() // only one distinct non-correct option exists
  })
})

describe.each(Object.keys(TEMPLATES) as TemplateId[])('template %s', (id) => {
  it.each([2, 4, 6])('builds %i distinct options, exactly one correct', (count) => {
    const subject = TEMPLATES[id].isApplicable(byId('Q258')) ? byId('Q258') : byId('Q38')
    const draft = build(id, subject, count)
    const options = allOptions(draft)
    expect(options).toHaveLength(count)
    expect(new Set(options.map((o) => o.key)).size).toBe(count)
    expect(new Set(options.map((o) => o.label)).size).toBe(count)
    expect(draft.prompt).toMatch(/\?$/)
  })

  it('returns undefined when there are not enough candidates', () => {
    const template = TEMPLATES[id]
    expect(template.build(byId('Q38'), [byId('Q142')], 4)).toBeUndefined()
  })
})

describe('country-capital', () => {
  it('requires the full set of capitals', () => {
    const draft = build('country-capital', byId('Q258'))
    expect(draft.subject).toBe('Sudafrica')
    expect(draft.correct.label).toBe('Bloemfontein, Città del Capo, Pretoria')
  })

  it('uses other countries’ capital sets as distractors', () => {
    const draft = build('country-capital', byId('Q38'), 8)
    const otherSets = new Set(COUNTRIES.map((c) => setOption(c.capitals).label))
    for (const option of draft.distractors) expect(otherSets.has(option.label)).toBe(true)
  })
})

describe('capital-country', () => {
  it('shows all capitals and uses a plural prompt for several', () => {
    const draft = build('capital-country', byId('Q750'))
    expect(draft.subject).toBe('La Paz, Sucre')
    expect(draft.prompt).toBe('Di quale paese sono le capitali?')
    expect(draft.correct.label).toBe('Bolivia')
  })

  it('never offers another country with the same capital', () => {
    const twin: Country = { ...byId('Q142'), id: 'Q999', name: 'Gemello' }
    const draft = TEMPLATES['capital-country'].build(byId('Q142'), [twin, ...COUNTRIES], 4)!
    expect(allOptions(draft).map((o) => o.label)).not.toContain('Gemello')
  })
})

describe('country-leader', () => {
  it('answers with heads of state and government together', () => {
    expect(build('country-leader', byId('Q408')).correct.label).toBe('Anthony Albanese, Carlo III')
  })
})

describe('flag-country', () => {
  it('shows the flag and never offers a look-alike flag', () => {
    for (let seed = 0; seed < 30; seed++) {
      const draft = build('flag-country', byId('Q252'), 8, seed)
      expect(draft.media).toEqual({ kind: 'flag', key: 'id' })
      expect(allOptions(draft).map((o) => o.label)).not.toContain('Monaco')
    }
  })

  it('does not apply to countries without a flag', () => {
    expect(TEMPLATES['flag-country'].isApplicable(byId('Q672'))).toBe(false)
  })
})

describe('silhouette-country and coat-of-arms-country', () => {
  it('show the matching image', () => {
    expect(build('silhouette-country', byId('Q38')).media).toEqual({
      kind: 'silhouette',
      key: 'Q38',
    })
    expect(build('coat-of-arms-country', byId('Q38')).media).toEqual({
      kind: 'coat-of-arms',
      key: 'Q38',
    })
  })
})

describe('comparisons', () => {
  it('compare-area marks the largest country as correct', () => {
    for (let seed = 0; seed < 20; seed++) {
      const draft = build('compare-area', byId('Q38'), 4, seed)
      const names = allOptions(draft).map((o) => o.label)
      const areas = names.map((n) => COUNTRIES.find((c) => c.name === n)!.area!)
      const largest = names[areas.indexOf(Math.max(...areas))]
      expect(draft.correct.label).toBe(largest)
      expect(names).toContain('Italia') // the subject is always an option
    }
  })

  it('compare-population marks the most populous country as correct', () => {
    const draft = build('compare-population', byId('Q148'), 3)
    expect(draft.correct.label).toBe(
      allOptions(draft)
        .map((o) => COUNTRIES.find((c) => c.name === o.label)!)
        .sort((a, b) => b.population! - a.population!)[0]!.name,
    )
  })

  it('skips candidates with the same value, so there are no ties', () => {
    const clone: Country = { ...byId('Q142'), id: 'Q998', name: 'Clone' }
    const draft = TEMPLATES['compare-area'].build(byId('Q142'), [clone, ...COUNTRIES], 3)!
    expect(allOptions(draft).map((o) => o.label)).not.toContain('Clone')
  })

  it('similar strategy picks countries of comparable size', () => {
    const template = TEMPLATES['compare-area']
    const order = orderCandidates(
      byId('Q38'),
      COUNTRIES,
      'similar',
      createRng(1),
      template.similarity,
      3,
    )
    const firstWindow = order.slice(0, 6)
    expect(firstWindow.map((c) => c.name)).not.toContain('Tuvalu')
    expect(firstWindow.map((c) => c.name)).not.toContain('Monaco')
  })
})
