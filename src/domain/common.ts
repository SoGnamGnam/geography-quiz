// Fields and building blocks shared by every entity type.
// Pure types and helpers: no UI, DOM or Node imports, so both the quiz engine
// and the build-time data pipeline can use this module.

/** A Wikidata item identifier, e.g. `Q38` (Italy). */
export type WikidataId = `Q${number}`

export function isWikidataId(value: string): value is WikidataId {
  return /^Q[1-9]\d*$/.test(value)
}

/**
 * How well known an entity is: 1 = very well known, 5 = obscure.
 * Assigned by hand (seeded from the Wikidata sitelinks count, see CONTEXT.md).
 * A quiz includes entities up to its notoriety threshold, so at threshold 5
 * every entity can appear.
 */
export type Notoriety = 1 | 2 | 3 | 4 | 5

export const NOTORIETY_LEVELS = [1, 2, 3, 4, 5] as const satisfies readonly Notoriety[]

/** WGS84 coordinates in decimal degrees. */
export interface Coordinates {
  readonly lat: number
  readonly lon: number
}

/**
 * An unordered collection of distinct values.
 *
 * Multi-valued attributes (capitals, leaders, languages, borders…) use this
 * type. It is a plain array so it serializes to JSON as is. The order carries
 * no meaning, and the data pipeline guarantees there are no duplicates. When an
 * attribute is the answer to a question, the correct answer is the whole set
 * (e.g. South Africa's capitals). An empty set means the value is unknown or
 * does not apply.
 */
export type ValueSet<T> = readonly T[]

/**
 * A reference to another Wikidata item, with its Italian label resolved at
 * build time so the app never needs to look it up.
 */
export interface Ref {
  readonly id: WikidataId
  /** Italian label. */
  readonly name: string
}

/** Fields every entity has, whatever its type. */
export interface BaseEntity {
  readonly id: WikidataId
  /** Italian name, as shown in questions and answers. */
  readonly name: string
  /** Other accepted Italian names and spellings (not including `name`). */
  readonly aliases: ValueSet<string>
  readonly notoriety: Notoriety
  /** Representative point (for a country, usually the centroid or the capital). */
  readonly coordinates?: Coordinates
}
