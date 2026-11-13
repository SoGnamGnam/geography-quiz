// SPARQL queries for the country dataset. Each query fetches one property for
// every country, so results stay small (no cartesian products) and each query
// is cached separately.

import type { Currency, Ref, WikidataId } from '../../src/domain'
import { sparql, type SparqlRow } from '../lib/sparql'
import {
  LABEL_SERVICE,
  groupBy,
  label,
  literal,
  numberValue,
  qid,
  requireQid,
  valuesClause,
} from '../lib/wikidata'

/** Everything the pipeline reads from Wikidata about one country, before cleaning. */
export interface RawCountry {
  readonly id: WikidataId
  sitelinks: number
  isUnMember: boolean
  isLimitedRecognition: boolean
  isLandlocked: boolean
  labelIt?: string
  labelFallback?: string
  aliases: string[]
  officialNames: string[]
  iso2: string[]
  iso3: string[]
  coordinates: { lat: number; lon: number }[]
  continents: WikidataId[]
  areas: number[]
  borders: WikidataId[]
  highestPoints: { ref: Ref; elevation?: number }[]
  timeZoneOffsets: number[]
  populations: { value: number; date?: string }[]
  demonyms: string[]
  capitals: Ref[]
  governmentForms: Ref[]
  leaders: Ref[]
  inceptions: string[]
  organizations: WikidataId[]
  currencies: Currency[]
  officialLanguages: Ref[]
  callingCodes: string[]
  tlds: string[]
  drivingSides: WikidataId[]
  coatsOfArms: string[]
}

export function emptyRawCountry(id: WikidataId): RawCountry {
  return {
    id,
    sitelinks: 0,
    isUnMember: false,
    isLimitedRecognition: false,
    isLandlocked: false,
    aliases: [],
    officialNames: [],
    iso2: [],
    iso3: [],
    coordinates: [],
    continents: [],
    areas: [],
    borders: [],
    highestPoints: [],
    timeZoneOffsets: [],
    populations: [],
    demonyms: [],
    capitals: [],
    governmentForms: [],
    leaders: [],
    inceptions: [],
    organizations: [],
    currencies: [],
    officialLanguages: [],
    callingCodes: [],
    tlds: [],
    drivingSides: [],
    coatsOfArms: [],
  }
}

// ---------------------------------------------------------------------------
// Candidate selection

export interface Candidate {
  readonly id: WikidataId
  readonly iso2: string
}

/** Items with an ISO 3166-1 alpha-2 code that have not been dissolved. */
export async function fetchIsoCandidates(): Promise<Candidate[]> {
  const rows = await sparql(`
    SELECT DISTINCT ?c ?iso2 WHERE {
      ?c wdt:P297 ?iso2 .
      FILTER NOT EXISTS { ?c wdt:P576 [] }
    }`)
  return rows.map((row) => ({ id: requireQid(row, 'c'), iso2: literal(row.iso2) ?? '' }))
}

async function fetchIdSet(query: string): Promise<Set<WikidataId>> {
  const rows = await sparql(query)
  return new Set(rows.map((row) => requireQid(row, 'c')))
}

/** Current members of the United Nations (membership statement without an end date). */
export const fetchUnMembers = () =>
  fetchIdSet(`
    SELECT DISTINCT ?c WHERE {
      ?c p:P463 ?st . ?st ps:P463 wd:Q1065 .
      FILTER NOT EXISTS { ?st pq:P582 [] }
    }`)

/** Instances of "state with limited recognition". Noisy: only used for candidates. */
export const fetchLimitedRecognition = () =>
  fetchIdSet(`SELECT DISTINCT ?c WHERE { ?c wdt:P31 wd:Q10711424 . }`)

/** Instances of "landlocked country". */
export const fetchLandlocked = () =>
  fetchIdSet(`SELECT DISTINCT ?c WHERE { ?c wdt:P31 wd:Q123480 . }`)

// ---------------------------------------------------------------------------
// Per-property queries

/**
 * Best-ranked statements of `pid` for every country. With `current`, statements
 * with an end time (P582) are dropped, so former capitals or leaders do not
 * appear.
 */
function statements(
  ids: readonly WikidataId[],
  pid: string,
  options: { current?: boolean; select?: string; where?: string; labels?: boolean } = {},
): Promise<SparqlRow[]> {
  return sparql(`
    SELECT ?c ?v ${options.labels ? '?vLabel' : ''} ${options.select ?? ''} WHERE {
      ${valuesClause('c', ids)}
      ?c p:${pid} ?st .
      ?st ps:${pid} ?v ; a wikibase:BestRank .
      ${options.current ? 'FILTER NOT EXISTS { ?st pq:P582 [] }' : ''}
      ${options.where ?? ''}
      ${options.labels ? LABEL_SERVICE : ''}
    }`)
}

function refOf(row: SparqlRow): Ref | undefined {
  const id = qid(row.v)
  const name = label(row.vLabel)
  return id && name ? { id, name } : undefined
}

const ITALIAN = 'FILTER(LANG(?v) = "it")'

/** Parses a WKT literal such as `Point(12.48 41.89)`. */
function parsePoint(wkt: string | undefined): { lat: number; lon: number } | undefined {
  const match = wkt?.match(/^Point\((-?[\d.]+) (-?[\d.]+)\)$/)
  if (!match) return undefined
  return { lon: Number(match[1]), lat: Number(match[2]) }
}

/** Turns a Commons Special:FilePath URL into a bare file name. */
function commonsFileName(url: string): string {
  return decodeURIComponent(url.slice(url.lastIndexOf('/') + 1)).replaceAll('_', ' ')
}

/**
 * Fills `raw` with every property the country dataset needs.
 * `log` receives progress messages.
 */
export async function fetchCountryProperties(
  raw: Map<WikidataId, RawCountry>,
  log: (message: string) => void,
): Promise<void> {
  const ids = [...raw.keys()]
  const each = async (
    what: string,
    rows: Promise<SparqlRow[]>,
    apply: (country: RawCountry, row: SparqlRow) => void,
  ) => {
    const result = await rows
    for (const [id, group] of groupBy(result, 'c')) {
      const country = raw.get(id)
      if (country) for (const row of group) apply(country, row)
    }
    log(`  ${what}: ${result.length} rows`)
  }
  await each(
    'labels',
    sparql(`
      SELECT ?c ?it ?fallback ?links WHERE {
        ${valuesClause('c', ids)}
        ?c wikibase:sitelinks ?links .
        OPTIONAL { ?c rdfs:label ?it . FILTER(LANG(?it) = "it") }
        OPTIONAL { ?c rdfs:label ?fallback . FILTER(LANG(?fallback) = "en") }
      }`),
    (c, row) => {
      c.labelIt = literal(row.it)
      c.labelFallback = literal(row.fallback)
      c.sitelinks = numberValue(row.links) ?? 0
    },
  )

  await each(
    'aliases',
    sparql(`
      SELECT ?c ?v WHERE {
        ${valuesClause('c', ids)}
        ?c skos:altLabel ?v . ${ITALIAN}
      }`),
    (c, row) => {
      const alias = literal(row.v)
      if (alias) c.aliases.push(alias)
    },
  )

  await each(
    'official names',
    statements(ids, 'P1448', { current: true, where: ITALIAN }),
    (c, row) => {
      const name = literal(row.v)
      if (name) c.officialNames.push(name)
    },
  )

  await each('ISO alpha-2', statements(ids, 'P297'), (c, row) => {
    const code = literal(row.v)
    if (code) c.iso2.push(code)
  })

  await each('ISO alpha-3', statements(ids, 'P298'), (c, row) => {
    const code = literal(row.v)
    if (code) c.iso3.push(code)
  })

  await each('coordinates', statements(ids, 'P625'), (c, row) => {
    const point = parsePoint(literal(row.v))
    if (point) c.coordinates.push(point)
  })

  await each('continents', statements(ids, 'P30'), (c, row) => {
    const id = qid(row.v)
    if (id) c.continents.push(id)
  })

  // psn: = value normalized to SI units (m²), whatever unit the statement uses.
  await each(
    'area',
    sparql(`
      SELECT ?c ?v WHERE {
        ${valuesClause('c', ids)}
        ?c p:P2046 ?st . ?st a wikibase:BestRank ; psn:P2046/wikibase:quantityAmount ?v .
      }`),
    (c, row) => {
      const m2 = numberValue(row.v)
      if (m2 !== undefined) c.areas.push(m2 / 1e6)
    },
  )

  await each('borders', statements(ids, 'P47', { current: true }), (c, row) => {
    const id = qid(row.v)
    if (id) c.borders.push(id)
  })

  await each(
    'highest point',
    statements(ids, 'P610', {
      labels: true,
      select: '?elevation',
      where: 'OPTIONAL { ?v p:P2044/psn:P2044/wikibase:quantityAmount ?elevation . }',
    }),
    (c, row) => {
      const ref = refOf(row)
      if (ref) c.highestPoints.push({ ref, elevation: numberValue(row.elevation) })
    },
  )

  // Time zone items carry their UTC offset (P2907) in hours.
  await each(
    'time zones',
    statements(ids, 'P421', { select: '?offset', where: '?v wdt:P2907 ?offset .' }),
    (c, row) => {
      const offset = numberValue(row.offset)
      if (offset !== undefined) c.timeZoneOffsets.push(offset)
    },
  )

  await each(
    'population',
    statements(ids, 'P1082', { select: '?date', where: 'OPTIONAL { ?st pq:P585 ?date . }' }),
    (c, row) => {
      const value = numberValue(row.v)
      if (value !== undefined) c.populations.push({ value, date: literal(row.date) })
    },
  )

  await each('demonyms', statements(ids, 'P1549', { where: ITALIAN }), (c, row) => {
    const demonym = literal(row.v)
    if (demonym) c.demonyms.push(demonym)
  })

  const refs = (pid: string, pick: (c: RawCountry) => Ref[], current = true) =>
    each(pid, statements(ids, pid, { current, labels: true }), (c, row) => {
      const ref = refOf(row)
      if (ref) pick(c).push(ref)
    })

  await refs('P36', (c) => c.capitals) // capital
  await refs('P122', (c) => c.governmentForms) // basic form of government
  await refs('P35', (c) => c.leaders) // head of state
  await refs('P6', (c) => c.leaders) // head of government
  await refs('P37', (c) => c.officialLanguages) // official language

  await each('inception', statements(ids, 'P571'), (c, row) => {
    const date = literal(row.v)
    if (date) c.inceptions.push(date)
  })

  await each('organizations', statements(ids, 'P463', { current: true }), (c, row) => {
    const id = qid(row.v)
    if (id) c.organizations.push(id)
  })

  await each(
    'currencies',
    statements(ids, 'P38', {
      current: true,
      labels: true,
      select: '?code',
      where: 'OPTIONAL { ?v wdt:P498 ?code . }',
    }),
    (c, row) => {
      const ref = refOf(row)
      if (!ref) return
      const code = literal(row.code)
      c.currencies.push(code ? { ...ref, code } : ref)
    },
  )

  await each('calling codes', statements(ids, 'P474'), (c, row) => {
    const code = literal(row.v)
    if (code) c.callingCodes.push(code)
  })

  await each('TLDs', statements(ids, 'P78', { labels: true }), (c, row) => {
    const tld = label(row.vLabel)
    if (tld) c.tlds.push(tld)
  })

  await each('driving side', statements(ids, 'P1622'), (c, row) => {
    const id = qid(row.v)
    if (id) c.drivingSides.push(id)
  })

  await each('coat of arms', statements(ids, 'P94'), (c, row) => {
    const url = row.v?.value
    if (url) c.coatsOfArms.push(commonsFileName(url))
  })
}
