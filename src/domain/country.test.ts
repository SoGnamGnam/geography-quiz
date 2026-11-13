import { describe, expect, it } from 'vitest'
import { isWikidataId } from './common'
import type { Country } from './country'
import { populationDensity } from './country'
import { SCHEMA_VERSION, type CountryDataset } from './dataset'

describe('populationDensity', () => {
  it('divides population by area', () => {
    expect(populationDensity({ population: 1000, area: 10 })).toBe(100)
  })

  it('is undefined when a value is missing or the area is not positive', () => {
    expect(populationDensity({ area: 10 })).toBeUndefined()
    expect(populationDensity({ population: 1000 })).toBeUndefined()
    expect(populationDensity({ population: 1000, area: 0 })).toBeUndefined()
  })
})

describe('isWikidataId', () => {
  it('accepts item ids', () => {
    expect(isWikidataId('Q38')).toBe(true)
  })

  it('rejects malformed ids', () => {
    for (const value of ['38', 'P38', 'Q', 'Q0', 'Q038', 'q38', 'Q38a']) {
      expect(isWikidataId(value)).toBe(false)
    }
  })
})

// A hand-written record exercising the special cases from CONTEXT.md:
// multiple capitals, multiple official languages, merged leaders.
// It also guards the type: if a required field is added to Country, this file
// stops compiling until the fixture is updated. Values are illustrative only.
const southAfrica: Country = {
  id: 'Q258',
  name: 'Sudafrica',
  aliases: ['Repubblica Sudafricana', 'Sud Africa'],
  notoriety: 1,
  coordinates: { lat: -29, lon: 24 },
  category: 'un-member',
  officialName: 'Repubblica del Sudafrica',
  iso2: 'ZA',
  iso3: 'ZAF',
  flag: 'za',
  continents: ['africa'],
  subregion: 'Africa australe',
  area: 1_221_037,
  borders: ['Q1033', 'Q963', 'Q954', 'Q1029', 'Q1013', 'Q1050'],
  seaAccess: true,
  highestPoint: { id: 'Q1000001', name: 'Mafadi', elevation: 3450 },
  timeZones: ['UTC+02:00'],
  population: 62_000_000,
  demonyms: ['sudafricano'],
  capitals: [
    { id: 'Q3926', name: 'Pretoria' },
    { id: 'Q5465', name: 'Città del Capo' },
    { id: 'Q37701', name: 'Bloemfontein' },
  ],
  governmentForms: [{ id: 'Q7270', name: 'repubblica' }],
  leaders: [{ id: 'Q1000002', name: 'Presidente di esempio' }],
  independenceYear: 1910,
  organizations: ['un', 'african-union', 'commonwealth', 'g20'],
  currencies: [{ id: 'Q181907', name: 'rand sudafricano', code: 'ZAR' }],
  officialLanguages: [
    { id: 'Q14196', name: 'afrikaans' },
    { id: 'Q1860', name: 'inglese' },
    { id: 'Q10179', name: 'zulu' },
  ],
  callingCodes: ['+27'],
  tlds: ['.za'],
  drivingSide: 'left',
}

describe('CountryDataset', () => {
  it('round-trips through JSON unchanged', () => {
    const dataset: CountryDataset = {
      schemaVersion: SCHEMA_VERSION,
      entityType: 'country',
      snapshotDate: '2026-11-01',
      entities: [southAfrica],
    }
    expect(JSON.parse(JSON.stringify(dataset))).toEqual(dataset)
  })
})
