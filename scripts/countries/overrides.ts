// Manual overrides for the country dataset (overrides/countries.json).
// See overrides/README.md for the file format.

import { readFile } from 'node:fs/promises'
import {
  COUNTRY_CATEGORIES,
  NOTORIETY_LEVELS,
  isWikidataId,
  type Country,
  type CountryCategory,
  type Notoriety,
  type WikidataId,
} from '../../src/domain'

export interface CountryOverride {
  /** Free text: why this override exists. Ignored by the pipeline. */
  readonly note?: string
  /** Add an item the automatic selection does not find. */
  readonly include?: boolean
  /** Drop an item the automatic selection finds. */
  readonly exclude?: boolean
  readonly category?: CountryCategory
  readonly notoriety?: Notoriety
  /** Replaces the Italian name from Wikidata. The old name becomes an alias. */
  readonly name?: string
  /** Extra aliases, added to the ones from Wikidata. */
  readonly aliases?: readonly string[]
  /** Aliases from Wikidata to drop. */
  readonly removeAliases?: readonly string[]
  /** Fields that replace the generated values verbatim (for wrong Wikidata data). */
  readonly patch?: Partial<Omit<Country, 'id'>>
}

export type CountryOverrides = ReadonlyMap<WikidataId, CountryOverride>

const KNOWN_KEYS = new Set([
  'note',
  'include',
  'exclude',
  'category',
  'notoriety',
  'name',
  'aliases',
  'removeAliases',
  'patch',
])

/** Parses and checks the overrides file, throwing on any malformed entry. */
export function parseOverrides(json: unknown): CountryOverrides {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new Error('overrides: expected an object keyed by Wikidata ID')
  }
  const result = new Map<WikidataId, CountryOverride>()
  for (const [key, value] of Object.entries(json)) {
    if (key.startsWith('$')) continue // "$schema", "$comment"…
    const where = `overrides["${key}"]`
    if (!isWikidataId(key)) throw new Error(`${where}: key is not a Wikidata ID`)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`${where}: expected an object`)
    }
    const entry = value as Record<string, unknown>
    for (const field of Object.keys(entry)) {
      if (!KNOWN_KEYS.has(field)) throw new Error(`${where}: unknown field "${field}"`)
    }
    if (entry.include && entry.exclude) throw new Error(`${where}: both include and exclude`)
    for (const flag of ['include', 'exclude'] as const) {
      if (entry[flag] !== undefined && typeof entry[flag] !== 'boolean') {
        throw new Error(`${where}.${flag}: expected a boolean`)
      }
    }
    for (const text of ['note', 'name'] as const) {
      if (entry[text] !== undefined && typeof entry[text] !== 'string') {
        throw new Error(`${where}.${text}: expected a string`)
      }
    }
    if (
      entry.category !== undefined &&
      !(COUNTRY_CATEGORIES as readonly unknown[]).includes(entry.category)
    ) {
      throw new Error(`${where}.category: expected one of ${COUNTRY_CATEGORIES.join(', ')}`)
    }
    if (
      entry.notoriety !== undefined &&
      !(NOTORIETY_LEVELS as readonly unknown[]).includes(entry.notoriety)
    ) {
      throw new Error(`${where}.notoriety: expected an integer from 1 to 5`)
    }
    for (const list of ['aliases', 'removeAliases'] as const) {
      const v = entry[list]
      if (v !== undefined && !(Array.isArray(v) && v.every((s) => typeof s === 'string'))) {
        throw new Error(`${where}.${list}: expected an array of strings`)
      }
    }
    if (
      entry.patch !== undefined &&
      (typeof entry.patch !== 'object' || entry.patch === null || Array.isArray(entry.patch))
    ) {
      throw new Error(`${where}.patch: expected an object`)
    }
    // The patch content is checked by the dataset validation after it is applied.
    result.set(key, entry as CountryOverride)
  }
  return result
}

export async function loadOverrides(path: string): Promise<CountryOverrides> {
  return parseOverrides(JSON.parse(await readFile(path, 'utf8')))
}
