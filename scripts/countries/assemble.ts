// Pure functions turning raw Wikidata facts into `Country` records.
// No network or file access here, so everything is unit-tested.

import {
  toRefSet,
  toValueSet,
  type Continent,
  type Country,
  type CountryCategory,
  type DrivingSide,
  type Notoriety,
  type Organization,
  type WikidataId,
} from '../../src/domain'
import type { CountryOverride } from './overrides'
import type { RawCountry } from './queries'

/** Wikidata items for continents (P30 values) and the codes each maps to. */
export const CONTINENT_ITEMS: Readonly<Record<string, readonly Continent[]>> = {
  Q15: ['africa'],
  Q51: ['antarctica'],
  Q48: ['asia'],
  Q46: ['europe'],
  Q49: ['north-america'],
  Q18: ['south-america'],
  Q55643: ['oceania'],
  Q538: ['oceania'], // Insular Oceania
  Q3960: ['oceania'], // Australia (continent)
  Q5401: ['europe', 'asia'], // Eurasia (used for Russia)
}

export const ORGANIZATION_ITEMS: Readonly<Record<string, Organization>> = {
  Q1065: 'un',
  Q458: 'eu',
  Q7184: 'nato',
  Q7159: 'african-union',
  Q7768: 'asean',
  Q7785: 'commonwealth',
  Q4264: 'mercosur',
  Q7795: 'opec',
  Q1764511: 'g7',
  Q19771: 'g20',
}

export const DRIVING_SIDE_ITEMS: Readonly<Record<string, DrivingSide>> = {
  Q11920728: 'left',
  Q14565199: 'right',
}

/**
 * Initial notoriety from the number of Wikipedia editions with an article on
 * the country. Only a starting point: overrides/countries.json corrects it.
 */
export function notorietyFromSitelinks(sitelinks: number): Notoriety {
  if (sitelinks >= 350) return 1
  if (sitelinks >= 310) return 2
  if (sitelinks >= 270) return 3
  if (sitelinks >= 200) return 4
  return 5
}

export function resolveCategory(raw: RawCountry, override?: CountryOverride): CountryCategory {
  if (override?.category) return override.category
  if (raw.isUnMember) return 'un-member'
  if (raw.isLimitedRecognition) return 'partially-recognized'
  return 'dependent-territory'
}

/** The most recent population figure; among figures with the same date, the largest. */
export function pickPopulation(populations: RawCountry['populations']): number | undefined {
  let best: { value: number; date?: string } | undefined
  for (const p of populations) {
    if (
      !best ||
      (p.date ?? '') > (best.date ?? '') ||
      ((p.date ?? '') === (best.date ?? '') && p.value > best.value)
    ) {
      best = p
    }
  }
  return best?.value
}

/** Formats an offset in hours as `UTC+05:30`. */
export function formatUtcOffset(hours: number): string {
  const sign = hours < 0 ? '-' : '+'
  const totalMinutes = Math.round(Math.abs(hours) * 60)
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `UTC${sign}${hh}:${mm}`
}

/** Year of a Wikidata date literal such as `1861-03-17T00:00:00Z` or `-0660-02-11T00:00:00Z`. */
export function yearOf(date: string): number | undefined {
  const match = date.match(/^(-?)(\d+)-/)
  if (!match) return undefined
  const year = Number(match[2])
  return match[1] ? -year : year
}

function sortedOffsets(hours: readonly number[]): string[] {
  return toValueSet([...hours].sort((a, b) => a - b).map(formatUtcOffset)) as string[]
}

function mapItems<T>(ids: readonly WikidataId[], table: Readonly<Record<string, T>>): T[] {
  const result: T[] = []
  for (const id of ids) {
    const value = table[id]
    if (value !== undefined) result.push(value)
  }
  return toValueSet(result) as T[]
}

export interface AssembleContext {
  readonly override?: CountryOverride
  /** IDs of every country in the dataset, to keep only borders between them. */
  readonly knownIds: ReadonlySet<WikidataId>
  /** Codes available in the `flag-icons` package (lowercase). */
  readonly flagCodes: ReadonlySet<string>
  readonly warn: (message: string) => void
}

export function assembleCountry(raw: RawCountry, ctx: AssembleContext): Country {
  const { override, warn } = ctx
  const where = `${raw.id} (${raw.labelIt ?? raw.labelFallback ?? '?'})`

  const wikidataName = raw.labelIt ?? raw.labelFallback
  if (!raw.labelIt && !override?.name) warn(`${where}: no Italian label`)
  const name = override?.name ?? wikidataName ?? raw.id

  const removed = new Set(override?.removeAliases ?? [])
  const aliases = toValueSet([
    ...(wikidataName && wikidataName !== name ? [wikidataName] : []),
    ...raw.aliases,
    ...(override?.aliases ?? []),
  ]).filter((alias) => alias !== name && !removed.has(alias))

  const category = resolveCategory(raw, override)
  const iso2 = raw.iso2[0]
  const flagCode = iso2?.toLowerCase()
  const continents = toValueSet(raw.continents.flatMap((id) => CONTINENT_ITEMS[id] ?? []))
  for (const id of raw.continents) {
    if (!(id in CONTINENT_ITEMS)) warn(`${where}: unknown continent item ${id}`)
  }

  const inceptionYears = raw.inceptions.map(yearOf).filter((y) => y !== undefined)
  const highest = [...raw.highestPoints].sort(
    (a, b) => (b.elevation ?? -Infinity) - (a.elevation ?? -Infinity),
  )[0]
  const drivingSides = mapItems(raw.drivingSides, DRIVING_SIDE_ITEMS)

  const country: Country = {
    id: raw.id,
    name,
    aliases,
    notoriety: override?.notoriety ?? notorietyFromSitelinks(raw.sitelinks),
    coordinates: raw.coordinates[0],
    category,
    // Wikidata often stores the short name as the official one: keep it only when it adds something.
    officialName: raw.officialNames.find((n) => n !== name && n !== wikidataName),
    iso2,
    iso3: raw.iso3[0],
    flag: flagCode && ctx.flagCodes.has(flagCode) ? flagCode : undefined,
    coatOfArms: raw.coatsOfArms[0],
    continents,
    area: raw.areas.length > 0 ? Math.round(Math.max(...raw.areas) * 100) / 100 : undefined,
    borders: toValueSet(raw.borders.filter((id) => id !== raw.id && ctx.knownIds.has(id))),
    seaAccess: !raw.isLandlocked,
    highestPoint: highest
      ? {
          ...highest.ref,
          ...(highest.elevation !== undefined ? { elevation: Math.round(highest.elevation) } : {}),
        }
      : undefined,
    timeZones: sortedOffsets(raw.timeZoneOffsets),
    population: pickPopulation(raw.populations),
    demonyms: toValueSet(raw.demonyms),
    capitals: toRefSet(raw.capitals),
    governmentForms: toRefSet(raw.governmentForms),
    leaders: toRefSet(raw.leaders),
    independenceYear:
      category !== 'dependent-territory' && inceptionYears.length > 0
        ? Math.min(...inceptionYears)
        : undefined,
    organizations: mapItems(raw.organizations, ORGANIZATION_ITEMS),
    currencies: toRefSet(raw.currencies),
    officialLanguages: toRefSet(raw.officialLanguages),
    callingCodes: toValueSet(
      raw.callingCodes.map((code) => (code.startsWith('+') ? code : `+${code}`)),
    ),
    // Only the ASCII two-letter ccTLD: internationalized domains (.рф, .中国…) are dropped.
    tlds: toValueSet(
      raw.tlds.map((tld) => tld.toLowerCase()).filter((tld) => /^\.[a-z]{2}$/.test(tld)),
    ),
    drivingSide: drivingSides.length === 1 ? drivingSides[0] : undefined,
  }

  return withoutUndefined({ ...country, ...override?.patch })
}

/** Drops keys whose value is undefined, so the JSON output stays compact and stable. */
function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}
