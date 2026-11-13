// Lazy loading of the datasets. Each JSON file becomes its own chunk, fetched
// the first time it is needed (and precached by the service worker for
// offline use).

import { SCHEMA_VERSION, type Dataset, type EntityType } from '../domain'
import type { QuizData } from '../engine'

const loaders: { [K in EntityType]: () => Promise<{ default: unknown }> } = {
  country: () => import('../../data/countries.json'),
}

const cache = new Map<EntityType, Promise<Dataset>>()

export function loadDataset<K extends EntityType>(type: K): Promise<Dataset<K>> {
  let promise = cache.get(type)
  if (!promise) {
    promise = loaders[type]().then(({ default: json }) => {
      const dataset = json as Dataset
      if (dataset.schemaVersion !== SCHEMA_VERSION || dataset.entityType !== type) {
        throw new Error(`Dataset ${type}: unsupported schema version ${dataset.schemaVersion}`)
      }
      return dataset
    })
    // Allow a retry after a failure (e.g. offline before the first visit completed).
    promise.catch(() => cache.delete(type))
    cache.set(type, promise)
  }
  return promise as Promise<Dataset<K>>
}

export async function loadQuizData(): Promise<QuizData> {
  const countries = await loadDataset('country')
  return { countries: countries.entities, snapshotDate: countries.snapshotDate }
}

export interface CoatOfArmsAttribution {
  readonly id: string
  readonly name: string
  readonly file: string
  readonly descriptionUrl: string
  readonly license: string
  readonly licenseUrl?: string
  readonly artist?: string
}

export async function loadCoatOfArmsAttributions(): Promise<CoatOfArmsAttribution[]> {
  const { default: json } = await import('../../data/attributions/coats-of-arms.json')
  return json as CoatOfArmsAttribution[]
}
