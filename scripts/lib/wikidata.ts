// Helpers for reading Wikidata SPARQL results.

import { isWikidataId, type WikidataId } from '../../src/domain'
import type { SparqlRow, SparqlTerm } from './sparql'

const ENTITY_PREFIX = 'http://www.wikidata.org/entity/'

/** Extracts the QID from an entity URI, or undefined if the term is not an item. */
export function qid(term: SparqlTerm | undefined): WikidataId | undefined {
  if (!term || term.type !== 'uri' || !term.value.startsWith(ENTITY_PREFIX)) return undefined
  const id = term.value.slice(ENTITY_PREFIX.length)
  return isWikidataId(id) ? id : undefined
}

/** Like `qid`, but throws: for columns that must always hold an item. */
export function requireQid(row: SparqlRow, column: string): WikidataId {
  const id = qid(row[column])
  if (!id) throw new Error(`Expected a Wikidata item in column "${column}": ${JSON.stringify(row)}`)
  return id
}

/**
 * Reads a label produced by the label service. The service falls back to the
 * bare QID when no label exists in the requested languages: that case returns
 * undefined, so callers can drop or report the value.
 */
export function label(term: SparqlTerm | undefined): string | undefined {
  if (!term || term.type !== 'literal') return undefined
  return isWikidataId(term.value) ? undefined : term.value
}

export function literal(term: SparqlTerm | undefined): string | undefined {
  return term?.type === 'literal' ? term.value : undefined
}

export function numberValue(term: SparqlTerm | undefined): number | undefined {
  const value = literal(term)
  if (value === undefined) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/** `VALUES ?var { wd:Q1 wd:Q2 … }` clause for a list of items. */
export function valuesClause(variable: string, ids: Iterable<WikidataId>): string {
  return `VALUES ?${variable} { ${[...ids].map((id) => `wd:${id}`).join(' ')} }`
}

/** Label service clause: Italian first, then the language-neutral `mul`, then English. */
export const LABEL_SERVICE =
  'SERVICE wikibase:label { bd:serviceParam wikibase:language "it,mul,en". }'

/** Groups rows by the item in `column`. */
export function groupBy(rows: readonly SparqlRow[], column: string): Map<WikidataId, SparqlRow[]> {
  const groups = new Map<WikidataId, SparqlRow[]>()
  for (const row of rows) {
    const id = qid(row[column])
    if (!id) continue
    const group = groups.get(id)
    if (group) group.push(row)
    else groups.set(id, [row])
  }
  return groups
}
