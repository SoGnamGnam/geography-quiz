// Orders candidate countries for distractor selection. Templates walk the
// returned list and take the first candidates that give a valid, distinct
// option, so the order encodes the difficulty strategy.

import type { Country } from '../domain'
import type { Rng } from './rng'
import type { DistractorStrategy } from './types'

/** Lower = more similar to the subject. */
export type Similarity = (subject: Country, other: Country) => number

/** Great-circle distance in km between two countries' coordinates (Infinity if unknown). */
export function distanceKm(a: Country, b: Country): number {
  if (!a.coordinates || !b.coordinates) return Infinity
  const rad = Math.PI / 180
  const dLat = (b.coordinates.lat - a.coordinates.lat) * rad
  const dLon = (b.coordinates.lon - a.coordinates.lon) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.coordinates.lat * rad) * Math.cos(b.coordinates.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Default similarity: bordering countries first, then by geographic distance. */
export const geographicSimilarity: Similarity = (subject, other) =>
  subject.borders.includes(other.id) || other.borders.includes(subject.id)
    ? -1
    : distanceKm(subject, other)

/**
 * Returns `pool` minus the subject, ordered for the given strategy:
 * - random: shuffled;
 * - same-continent: countries sharing a continent (shuffled), then the rest (shuffled);
 * - similar: by similarity, with the closest candidates lightly shuffled so the
 *   same subject does not always get the same distractors.
 */
export function orderCandidates(
  subject: Country,
  pool: readonly Country[],
  strategy: DistractorStrategy,
  rng: Rng,
  similarity: Similarity = geographicSimilarity,
  /** How many distractors are needed: sets the size of the shuffled window for `similar`. */
  needed = 3,
): Country[] {
  const others = pool.filter((c) => c.id !== subject.id)
  switch (strategy) {
    case 'random':
      return rng.shuffle(others)
    case 'same-continent': {
      const shares = (c: Country) => c.continents.some((x) => subject.continents.includes(x))
      return [
        ...rng.shuffle(others.filter(shares)),
        ...rng.shuffle(others.filter((c) => !shares(c))),
      ]
    }
    case 'similar': {
      const sorted = others
        .map((country) => ({ country, score: similarity(subject, country) }))
        .sort((a, b) => a.score - b.score)
        .map((entry) => entry.country)
      const window = Math.max(needed * 2, needed + 2)
      return [...rng.shuffle(sorted.slice(0, window)), ...sorted.slice(window)]
    }
  }
}
