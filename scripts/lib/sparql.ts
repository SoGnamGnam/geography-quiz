// Minimal Wikidata SPARQL client for the build-time data pipeline.
// Responses are cached on disk (scripts/.cache/sparql/, git-ignored) so that
// re-running the pipeline while developing does not hit Wikidata again.
// Pass `--refresh` on the command line (or set SPARQL_REFRESH=1) to bypass the cache.

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'sparql')

/**
 * Wikimedia asks automated clients to send a descriptive User-Agent. Set
 * WIKIDATA_USER_AGENT (e.g. in the GitHub Action) to include a contact URL.
 */
const USER_AGENT = process.env.WIKIDATA_USER_AGENT ?? 'geo-data-pipeline/0.1 (build script)'

const refresh = process.argv.includes('--refresh') || process.env.SPARQL_REFRESH === '1'

export interface SparqlTerm {
  readonly type: 'uri' | 'literal' | 'bnode'
  readonly value: string
  readonly 'xml:lang'?: string
  readonly datatype?: string
}

export type SparqlRow = Readonly<Record<string, SparqlTerm | undefined>>

interface SparqlResponse {
  readonly results: { readonly bindings: SparqlRow[] }
}

export async function sparql(query: string): Promise<SparqlRow[]> {
  const key = createHash('sha256').update(query).digest('hex').slice(0, 32)
  const cacheFile = join(CACHE_DIR, `${key}.json`)

  if (!refresh) {
    try {
      const cached = JSON.parse(await readFile(cacheFile, 'utf8')) as SparqlResponse
      return cached.results.bindings
    } catch {
      // Not cached yet: fall through to the network.
    }
  }

  const body = await fetchWithRetry(query)
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(cacheFile, body)
  return (JSON.parse(body) as SparqlResponse).results.bindings
}

async function fetchWithRetry(query: string, attempts = 4): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: new URLSearchParams({ query }),
      signal: AbortSignal.timeout(120_000),
    }).catch((error: unknown) => error as Error)

    if (!(response instanceof Error) && response.ok) return response.text()

    const retryable = response instanceof Error || response.status === 429 || response.status >= 500
    if (!retryable || attempt >= attempts) {
      const detail =
        response instanceof Error ? response.message : `${response.status} ${await response.text()}`
      throw new Error(`SPARQL query failed: ${detail.slice(0, 500)}\n${query}`)
    }
    // Respect Retry-After when present, otherwise back off exponentially.
    const retryAfter = response instanceof Error ? null : response.headers.get('retry-after')
    const delay = retryAfter ? Number(retryAfter) * 1000 : 2 ** attempt * 1000
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
}
