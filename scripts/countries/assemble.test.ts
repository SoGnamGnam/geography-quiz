import { describe, expect, it } from 'vitest'
import type { WikidataId } from '../../src/domain'
import { validateCountry } from '../lib/validate'
import {
  assembleCountry,
  formatUtcOffset,
  notorietyFromSitelinks,
  pickPopulation,
  resolveCategory,
  yearOf,
} from './assemble'
import { emptyRawCountry, type RawCountry } from './queries'

function raw(fields: Partial<RawCountry> = {}): RawCountry {
  return { ...emptyRawCountry('Q258'), labelIt: 'Sudafrica', sitelinks: 368, ...fields }
}

const ctx = (overrides: Partial<Parameters<typeof assembleCountry>[1]> = {}) => ({
  knownIds: new Set<WikidataId>(['Q258', 'Q1030', 'Q963']),
  flagCodes: new Set(['za']),
  warn: () => {},
  ...overrides,
})

describe('notorietyFromSitelinks', () => {
  it('maps more sitelinks to better-known levels', () => {
    expect(notorietyFromSitelinks(420)).toBe(1)
    expect(notorietyFromSitelinks(320)).toBe(2)
    expect(notorietyFromSitelinks(280)).toBe(3)
    expect(notorietyFromSitelinks(210)).toBe(4)
    expect(notorietyFromSitelinks(50)).toBe(5)
  })
})

describe('resolveCategory', () => {
  it('prefers the override, then UN membership, then limited recognition', () => {
    expect(resolveCategory(raw({ isUnMember: true }), { category: 'un-observer' })).toBe(
      'un-observer',
    )
    expect(resolveCategory(raw({ isUnMember: true, isLimitedRecognition: true }))).toBe('un-member')
    expect(resolveCategory(raw({ isLimitedRecognition: true }))).toBe('partially-recognized')
    expect(resolveCategory(raw())).toBe('dependent-territory')
  })
})

describe('pickPopulation', () => {
  it('takes the most recent figure', () => {
    expect(
      pickPopulation([
        { value: 100, date: '2011-01-01T00:00:00Z' },
        { value: 120, date: '2022-01-01T00:00:00Z' },
        { value: 90 },
      ]),
    ).toBe(120)
  })

  it('takes the largest figure among those with the same date', () => {
    expect(pickPopulation([{ value: 5 }, { value: 7 }])).toBe(7)
  })

  it('is undefined without figures', () => {
    expect(pickPopulation([])).toBeUndefined()
  })
})

describe('formatUtcOffset', () => {
  it('formats whole, fractional and negative offsets', () => {
    expect(formatUtcOffset(1)).toBe('UTC+01:00')
    expect(formatUtcOffset(5.5)).toBe('UTC+05:30')
    expect(formatUtcOffset(-3.5)).toBe('UTC-03:30')
    expect(formatUtcOffset(0)).toBe('UTC+00:00')
  })
})

describe('yearOf', () => {
  it('reads positive and negative years', () => {
    expect(yearOf('1861-03-17T00:00:00Z')).toBe(1861)
    expect(yearOf('-0660-02-11T00:00:00Z')).toBe(-660)
    expect(yearOf('not a date')).toBeUndefined()
  })
})

describe('assembleCountry', () => {
  it('keeps all capitals as a set, removing duplicates', () => {
    const country = assembleCountry(
      raw({
        capitals: [
          { id: 'Q3926', name: 'Pretoria' },
          { id: 'Q5465', name: 'Città del Capo' },
          { id: 'Q37701', name: 'Bloemfontein' },
          { id: 'Q3926', name: 'Pretoria' },
        ],
      }),
      ctx(),
    )
    expect(country.capitals.map((c) => c.name)).toEqual([
      'Pretoria',
      'Città del Capo',
      'Bloemfontein',
    ])
  })

  it('merges heads of state and government into leaders', () => {
    const country = assembleCountry(
      raw({
        leaders: [
          { id: 'Q1', name: 'Capo di Stato' },
          { id: 'Q2', name: 'Capo di Governo' },
        ],
      }),
      ctx(),
    )
    expect(country.leaders).toHaveLength(2)
  })

  it('keeps only borders with countries in the dataset, and never itself', () => {
    const country = assembleCountry(raw({ borders: ['Q1030', 'Q963', 'Q99999', 'Q258'] }), ctx())
    expect(country.borders).toEqual(['Q1030', 'Q963'])
  })

  it('maps Eurasia to both Europe and Asia', () => {
    expect(assembleCountry(raw({ continents: ['Q5401', 'Q46'] }), ctx()).continents).toEqual([
      'europe',
      'asia',
    ])
  })

  it('warns about unknown continent items', () => {
    const warnings: string[] = []
    assembleCountry(raw({ continents: ['Q123'] }), ctx({ warn: (m) => warnings.push(m) }))
    expect(warnings).toHaveLength(1)
  })

  it('sets the flag only when flag-icons has it', () => {
    expect(assembleCountry(raw({ iso2: ['ZA'] }), ctx()).flag).toBe('za')
    expect(assembleCountry(raw({ iso2: ['XX'] }), ctx()).flag).toBeUndefined()
  })

  it('keeps only ASCII two-letter TLDs', () => {
    expect(assembleCountry(raw({ tlds: ['.ZA', '.рф', '.co.za'] }), ctx()).tlds).toEqual(['.za'])
  })

  it('omits the independence year for dependent territories', () => {
    expect(
      assembleCountry(raw({ inceptions: ['1910-05-31T00:00:00Z'] }), ctx()).independenceYear,
    ).toBeUndefined()
    expect(
      assembleCountry(raw({ isUnMember: true, inceptions: ['1910-05-31T00:00:00Z'] }), ctx())
        .independenceYear,
    ).toBe(1910)
  })

  it('applies name, aliases, notoriety and patch overrides', () => {
    const country = assembleCountry(
      raw({ aliases: ['Sud Africa', 'RSA'] }),
      ctx({
        override: {
          name: 'Repubblica Sudafricana',
          notoriety: 2,
          aliases: ['Sudafrica (stato)'],
          removeAliases: ['RSA'],
          patch: { drivingSide: 'left' },
        },
      }),
    )
    expect(country.name).toBe('Repubblica Sudafricana')
    expect(country.aliases).toEqual(['Sudafrica', 'Sud Africa', 'Sudafrica (stato)'])
    expect(country.notoriety).toBe(2)
    expect(country.drivingSide).toBe('left')
  })

  it('omits missing optional fields instead of writing undefined', () => {
    const country = assembleCountry(raw(), ctx())
    expect(Object.keys(country)).not.toContain('area')
    expect(Object.keys(country)).not.toContain('population')
  })

  it('produces records that pass validation', () => {
    const country = assembleCountry(
      raw({
        isUnMember: true,
        iso2: ['ZA'],
        iso3: ['ZAF'],
        areas: [1220813.4],
        populations: [{ value: 62_027_503 }],
        timeZoneOffsets: [2],
        callingCodes: ['27'],
      }),
      ctx(),
    )
    expect(validateCountry(country, new Set(['Q258']))).toEqual([])
    expect(country.callingCodes).toEqual(['+27'])
    expect(country.area).toBe(1220813.4)
  })
})
