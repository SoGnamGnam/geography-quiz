import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, type Country, type CountryDataset } from '../../src/domain'
import { serializeDataset } from './output'
import { validateCountry, validateCountryDataset } from './validate'

const minimal: Country = {
  id: 'Q38',
  name: 'Italia',
  aliases: [],
  notoriety: 1,
  category: 'un-member',
  continents: ['europe'],
  borders: [],
  timeZones: [],
  demonyms: [],
  capitals: [{ id: 'Q220', name: 'Roma' }],
  governmentForms: [],
  leaders: [],
  organizations: [],
  currencies: [],
  officialLanguages: [],
  callingCodes: [],
  tlds: [],
}

describe('validateCountry', () => {
  it('accepts a minimal valid record', () => {
    expect(validateCountry(minimal, new Set(['Q38']))).toEqual([])
  })

  it('reports invalid values', () => {
    const errors = validateCountry(
      { ...minimal, notoriety: 7 as never, iso2: 'ita', callingCodes: ['39'] },
      new Set(['Q38']),
    )
    expect(errors).toHaveLength(3)
  })

  it('reports duplicates in sets, comparing references by id', () => {
    const errors = validateCountry(
      {
        ...minimal,
        capitals: [
          { id: 'Q220', name: 'Roma' },
          { id: 'Q220', name: 'Rome' },
        ],
      },
      new Set(['Q38']),
    )
    expect(errors).toEqual(['capitals: contains duplicates'])
  })

  it('reports borders with unknown countries', () => {
    expect(validateCountry({ ...minimal, borders: ['Q142'] }, new Set(['Q38']))).toHaveLength(1)
  })

  it('accepts a population of zero (uninhabited territories)', () => {
    expect(validateCountry({ ...minimal, population: 0 }, new Set(['Q38']))).toEqual([])
  })
})

describe('serializeDataset', () => {
  it('writes one entity per line and round-trips', () => {
    const dataset: CountryDataset = {
      schemaVersion: SCHEMA_VERSION,
      entityType: 'country',
      snapshotDate: '2026-11-13',
      entities: [minimal, { ...minimal, id: 'Q142', name: 'Francia' }],
    }
    const text = serializeDataset(dataset)
    expect(text.split('\n')).toHaveLength(5)
    expect(JSON.parse(text)).toEqual(dataset)
  })
})

describe('data/countries.json', () => {
  it('is a valid dataset', () => {
    const file = join(import.meta.dirname, '..', '..', 'data', 'countries.json')
    const dataset = JSON.parse(readFileSync(file, 'utf8')) as CountryDataset
    expect(dataset.schemaVersion).toBe(SCHEMA_VERSION)
    expect(validateCountryDataset(dataset)).toEqual([])
  })
})
