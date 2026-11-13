import type { Country, Notoriety } from '../domain'
import type { QuizFilters } from './types'

/** Countries passing the quiz-wide filters (continent, category). */
export function applyFilters(countries: readonly Country[], filters: QuizFilters): Country[] {
  return countries.filter(
    (c) =>
      (filters.continents.length === 0 ||
        c.continents.some((continent) => filters.continents.includes(continent))) &&
      (filters.categories.length === 0 || filters.categories.includes(c.category)),
  )
}

export function withinNotoriety(countries: readonly Country[], max: Notoriety): Country[] {
  return countries.filter((c) => c.notoriety <= max)
}
