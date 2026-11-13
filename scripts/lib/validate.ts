// Runtime validation of generated datasets: the TypeScript types only exist at
// compile time, so the pipeline re-checks every record before writing it.

import {
  CONTINENTS,
  COUNTRY_CATEGORIES,
  NOTORIETY_LEVELS,
  ORGANIZATIONS,
  isWikidataId,
  type Country,
  type CountryDataset,
} from '../../src/domain'

type Check = (value: unknown) => boolean

const isString: Check = (v) => typeof v === 'string' && v.trim().length > 0
const isNumber: Check = (v) => typeof v === 'number' && Number.isFinite(v)
const isPositive: Check = (v) => isNumber(v) && (v as number) > 0
const isInteger: Check = (v) => Number.isInteger(v)
const oneOf =
  (values: readonly unknown[]): Check =>
  (v) =>
    values.includes(v)
const isRef: Check = (v) =>
  typeof v === 'object' &&
  v !== null &&
  isWikidataId(String((v as { id?: unknown }).id)) &&
  isString((v as { name?: unknown }).name)

/** Validates one country; returns a list of problems (empty when valid). */
export function validateCountry(country: Country, knownIds: ReadonlySet<string>): string[] {
  const errors: string[] = []
  const c = country as unknown as Record<string, unknown>
  const fail = (field: string, message: string) => errors.push(`${field}: ${message}`)

  const required = (field: string, check: Check) => {
    if (!check(c[field])) fail(field, `invalid value ${JSON.stringify(c[field])}`)
  }
  const optional = (field: string, check: Check) => {
    if (c[field] !== undefined && !check(c[field])) {
      fail(field, `invalid value ${JSON.stringify(c[field])}`)
    }
  }
  const set = (field: string, check: Check, key: (v: unknown) => unknown = (v) => v) => {
    const value = c[field]
    if (!Array.isArray(value)) return fail(field, 'expected an array')
    value.forEach((item, i) => {
      if (!check(item)) fail(`${field}[${i}]`, `invalid value ${JSON.stringify(item)}`)
    })
    const keys = value.map(key)
    if (new Set(keys).size !== keys.length) fail(field, 'contains duplicates')
  }
  const refKey = (v: unknown) => (v as { id: string }).id

  required('id', (v) => isWikidataId(String(v)))
  required('name', isString)
  set('aliases', isString)
  required('notoriety', oneOf(NOTORIETY_LEVELS))
  optional(
    'coordinates',
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      Math.abs((v as { lat: number }).lat) <= 90 &&
      Math.abs((v as { lon: number }).lon) <= 180,
  )
  required('category', oneOf(COUNTRY_CATEGORIES))
  optional('officialName', isString)
  optional('iso2', (v) => /^[A-Z]{2}$/.test(String(v)))
  optional('iso3', (v) => /^[A-Z]{3}$/.test(String(v)))
  optional('flag', (v) => /^[a-z]{2}$/.test(String(v)))
  optional('coatOfArms', isString)
  optional('silhouette', isString)
  set('continents', oneOf(CONTINENTS))
  optional('subregion', isString)
  optional('area', isPositive)
  set('borders', (v) => knownIds.has(String(v)) && v !== country.id)
  optional('seaAccess', (v) => typeof v === 'boolean')
  optional('highestPoint', isRef)
  set('timeZones', (v) => /^UTC[+-]\d{2}:\d{2}$/.test(String(v)))
  // 0 is valid: some territories are uninhabited (Bouvet Island…).
  optional('population', (v) => isNumber(v) && (v as number) >= 0 && isInteger(v))
  set('demonyms', isString)
  set('capitals', isRef, refKey)
  set('governmentForms', isRef, refKey)
  set('leaders', isRef, refKey)
  optional('independenceYear', isInteger)
  set('organizations', oneOf(ORGANIZATIONS))
  set('currencies', isRef, refKey)
  set('officialLanguages', isRef, refKey)
  set('callingCodes', (v) => /^\+\d[\d ]*$/.test(String(v)))
  set('tlds', (v) => /^\.[a-z]{2}$/.test(String(v)))
  optional('drivingSide', oneOf(['left', 'right']))

  return errors
}

/** Validates a whole dataset; returns problems prefixed with the entity id. */
export function validateCountryDataset(dataset: CountryDataset): string[] {
  const errors: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataset.snapshotDate)) {
    errors.push(`snapshotDate: invalid value ${dataset.snapshotDate}`)
  }
  const ids = dataset.entities.map((c) => c.id)
  const knownIds = new Set<string>(ids)
  if (knownIds.size !== ids.length) errors.push('entities: duplicate ids')
  for (const country of dataset.entities) {
    for (const error of validateCountry(country, knownIds)) {
      errors.push(`${country.id} (${country.name}) ${error}`)
    }
  }
  return errors
}
