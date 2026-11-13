import type { BaseEntity } from './common'
import type { Country } from './country'

/**
 * Version of the JSON dataset format. Bump it on every breaking change to the
 * entity types, so the app can reject datasets it cannot read.
 */
export const SCHEMA_VERSION = 1

/** Entity types that have a dataset. Grows as M7 adds regions, cities… */
export interface EntityTypes {
  country: Country
}

export type EntityType = keyof EntityTypes

/** The envelope wrapping every generated JSON file under `data/`. */
export interface Dataset<K extends EntityType = EntityType> {
  readonly schemaVersion: number
  readonly entityType: K
  /**
   * Date of the Wikidata snapshot, as an ISO 8601 date (`YYYY-MM-DD`). Shown
   * on questions about data that changes over time ("dati aggiornati al…").
   */
  readonly snapshotDate: string
  readonly entities: readonly EntityTypes[K][]
}

export type CountryDataset = Dataset<'country'>

// Compile-time check: every entity type must extend the common fields.
// Adding an entity type that does not extend BaseEntity breaks this line.
type ExtendsBaseEntity<T extends Record<EntityType, BaseEntity>> = T
export type CheckedEntityTypes = ExtendsBaseEntity<EntityTypes>
