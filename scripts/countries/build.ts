// Builds data/countries.json from Wikidata.
//
//   npm run data:countries              (uses the on-disk SPARQL cache)
//   npm run data:countries -- --refresh (re-queries Wikidata)
//
// Steps: select candidate items, fetch their properties, apply the manual
// overrides, generate silhouettes, download coats of arms, validate, and
// write the dataset (plus the coat-of-arms attributions in THIRD_PARTY.md).

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SCHEMA_VERSION,
  type Country,
  type CountryDataset,
  type WikidataId,
} from '../../src/domain'
import { writeDataset } from '../lib/output'
import { validateCountryDataset } from '../lib/validate'
import { assembleCountry } from './assemble'
import { attributionTable, buildCoatsOfArms, type Attribution } from './coats-of-arms'
import { loadOverrides } from './overrides'
import { findSharedFlags } from './flags'
import { buildSilhouettes } from './silhouettes'
import {
  emptyRawCountry,
  fetchCountryProperties,
  fetchIsoCandidates,
  fetchLandlocked,
  fetchLimitedRecognition,
  fetchUnMembers,
  type RawCountry,
} from './queries'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OVERRIDES = join(ROOT, 'overrides', 'countries.json')
const OUTPUT = join(ROOT, 'data', 'countries.json')
const FLAGS_DIR = join(ROOT, 'node_modules', 'flag-icons', 'flags', '4x3')
const SILHOUETTES_DIR = join(ROOT, 'public', 'silhouettes')
const NATURAL_EARTH_CACHE = join(ROOT, 'scripts', '.cache', 'natural-earth')
const COATS_OF_ARMS_DIR = join(ROOT, 'public', 'coats-of-arms')
const COMMONS_CACHE = join(ROOT, 'scripts', '.cache', 'commons')
const ATTRIBUTIONS = join(ROOT, 'data', 'attributions', 'coats-of-arms.json')
const THIRD_PARTY = join(ROOT, 'THIRD_PARTY.md')

const log = (message: string) => console.log(message)

async function main() {
  const overrides = await loadOverrides(OVERRIDES)

  log('Selecting candidates…')
  const [isoCandidates, unMembers, limited, landlocked] = await Promise.all([
    fetchIsoCandidates(),
    fetchUnMembers(),
    fetchLimitedRecognition(),
    fetchLandlocked(),
  ])

  const ids = new Set<WikidataId>(isoCandidates.map((c) => c.id))
  for (const [id, override] of overrides) {
    if (override.include) ids.add(id)
    if (override.exclude) ids.delete(id)
  }
  log(`  ${isoCandidates.length} items with an ISO code, ${ids.size} after overrides`)

  const raw = new Map<WikidataId, RawCountry>()
  for (const id of ids) {
    const country = emptyRawCountry(id)
    country.isUnMember = unMembers.has(id)
    country.isLimitedRecognition = limited.has(id)
    country.isLandlocked = landlocked.has(id)
    raw.set(id, country)
  }

  log('Fetching properties…')
  await fetchCountryProperties(raw, log)

  const flagCodes = new Set(
    (await readdir(FLAGS_DIR)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)),
  )
  const warnings: string[] = []
  const assembled: Country[] = [...raw.values()]
    .map((country) =>
      assembleCountry(country, {
        override: overrides.get(country.id),
        knownIds: ids,
        flagCodes,
        warn: (message) => warnings.push(message),
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))

  const sharedFlags = await findSharedFlags(assembled, FLAGS_DIR)
  log(`Dropped ${sharedFlags.size} flags shared with another country`)

  log('Generating silhouettes…')
  const withSilhouette = await buildSilhouettes(assembled, NATURAL_EARTH_CACHE, SILHOUETTES_DIR)
  log(`  ${withSilhouette.size} silhouettes`)

  log('Downloading coats of arms…')
  const withCoatOfArms = await buildCoatsOfArms(
    assembled.flatMap((c) =>
      c.coatOfArms ? [{ id: c.id, name: c.name, file: c.coatOfArms }] : [],
    ),
    COMMONS_CACHE,
    COATS_OF_ARMS_DIR,
    ATTRIBUTIONS,
    log,
  )
  log(`  ${withCoatOfArms.size} coats of arms`)
  await updateThirdParty()

  // From here on, silhouette and coatOfArms hold asset keys (the QID), not source
  // names. Undefined values are dropped when the JSON is written.
  const entities: Country[] = assembled.map((country) => ({
    ...country,
    flag: sharedFlags.has(country.id) ? undefined : country.flag,
    silhouette: withSilhouette.has(country.id) ? country.id : undefined,
    coatOfArms: withCoatOfArms.has(country.id) ? country.id : undefined,
  }))

  const dataset: CountryDataset = {
    schemaVersion: SCHEMA_VERSION,
    entityType: 'country',
    snapshotDate: new Date().toISOString().slice(0, 10),
    entities,
  }

  report(dataset, warnings)

  const errors = validateCountryDataset(dataset)
  if (errors.length > 0) {
    console.error(`\n${errors.length} validation errors:`)
    for (const error of errors) console.error(`  ${error}`)
    process.exitCode = 1
    return
  }

  await writeDataset(OUTPUT, dataset)
  log(`\nWrote ${entities.length} countries to data/countries.json`)
}

/** Rewrites the coat-of-arms table in THIRD_PARTY.md between its marker comments. */
async function updateThirdParty() {
  const attributions = JSON.parse(await readFile(ATTRIBUTIONS, 'utf8')) as Attribution[]
  const text = await readFile(THIRD_PARTY, 'utf8')
  const start = '<!-- coats-of-arms:start -->'
  const end = '<!-- coats-of-arms:end -->'
  const from = text.indexOf(start)
  const to = text.indexOf(end)
  if (from === -1 || to === -1) throw new Error(`THIRD_PARTY.md: missing ${start} / ${end} markers`)
  const updated = `${text.slice(0, from + start.length)}

${attributionTable(attributions)}

${text.slice(to)}`
  await writeFile(THIRD_PARTY, updated)
}

/** Prints counts and the gaps worth reviewing by hand. */
function report(dataset: CountryDataset, warnings: string[]) {
  const countries = dataset.entities
  const byCategory = Object.groupBy(countries, (c) => c.category)
  log('\nCategories:')
  for (const [category, list] of Object.entries(byCategory)) log(`  ${category}: ${list?.length}`)

  const missing = (field: keyof Country) =>
    countries
      .filter((c) => {
        const v = c[field]
        return v === undefined || (Array.isArray(v) && v.length === 0)
      })
      .map((c) => c.name)
  log('\nMissing values (sovereign states only):')
  const sovereign = (c: Country) => c.category !== 'dependent-territory'
  for (const field of [
    'capitals',
    'leaders',
    'flag',
    'area',
    'population',
    'continents',
    'currencies',
    'officialLanguages',
    'drivingSide',
    'silhouette',
    'coatOfArms',
  ] as const) {
    const names = missing(field).filter((name) =>
      sovereign(countries.find((c) => c.name === name)!),
    )
    if (names.length > 0) log(`  ${field} (${names.length}): ${names.join(', ')}`)
  }
  if (warnings.length > 0) {
    log(`\n${warnings.length} warnings:`)
    for (const warning of warnings) log(`  ${warning}`)
  }
}

await main()
