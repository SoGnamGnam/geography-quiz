import type { BaseEntity, Ref, ValueSet, WikidataId } from './common'

/** Political status of a country, usable as a quiz filter. */
export type CountryCategory =
  /** One of the 193 UN member states. */
  | 'un-member'
  /** UN General Assembly observer state (Vatican City, Palestine). */
  | 'un-observer'
  /** Sovereignty disputed or recognized by only some states (Kosovo, Taiwan…). */
  | 'partially-recognized'
  /** Territory dependent on another state (Greenland, Puerto Rico…). */
  | 'dependent-territory'

export const COUNTRY_CATEGORIES = [
  'un-member',
  'un-observer',
  'partially-recognized',
  'dependent-territory',
] as const satisfies readonly CountryCategory[]

export type Continent =
  'africa' | 'antarctica' | 'asia' | 'europe' | 'north-america' | 'oceania' | 'south-america'

export const CONTINENTS = [
  'africa',
  'antarctica',
  'asia',
  'europe',
  'north-america',
  'oceania',
  'south-america',
] as const satisfies readonly Continent[]

export type DrivingSide = 'left' | 'right'

/**
 * International organizations the quiz asks about. Extend this list together
 * with the pipeline's organization query.
 */
export type Organization =
  | 'un'
  | 'eu'
  | 'nato'
  | 'african-union'
  | 'asean'
  | 'commonwealth'
  | 'mercosur'
  | 'opec'
  | 'g7'
  | 'g20'

export const ORGANIZATIONS = [
  'un',
  'eu',
  'nato',
  'african-union',
  'asean',
  'commonwealth',
  'mercosur',
  'opec',
  'g7',
  'g20',
] as const satisfies readonly Organization[]

export interface Currency extends Ref {
  /** ISO 4217 code, e.g. `EUR`. Missing for currencies without one. */
  readonly code?: string
}

/** The highest point of a country (a mountain, hill or other landform). */
export interface HighestPoint extends Ref {
  /** Elevation above sea level, in metres. */
  readonly elevation?: number
}

/**
 * A country or territory.
 *
 * Optional scalar fields are missing when Wikidata has no usable value;
 * multi-valued fields are then an empty set.
 */
export interface Country extends BaseEntity {
  // Identity
  readonly category: CountryCategory
  /** Italian full official name, e.g. "Repubblica Italiana". */
  readonly officialName?: string
  /** ISO 3166-1 alpha-2 code (or the user-assigned `XK` for Kosovo). */
  readonly iso2?: string
  /** ISO 3166-1 alpha-3 code. */
  readonly iso3?: string
  /**
   * Key of the flag asset (lowercase `flag-icons` code, e.g. `it`).
   * Missing when no flag is available.
   */
  readonly flag?: string
  /** Key of the coat of arms image (`public/coats-of-arms/<key>.webp`), if any. */
  readonly coatOfArms?: string
  /** Key of the generated silhouette (`public/silhouettes/<key>.svg`), if Natural Earth has the shape. */
  readonly silhouette?: string

  // Geography
  /** Usually one; transcontinental countries (Russia, Turkey, Egypt…) have several. */
  readonly continents: ValueSet<Continent>
  /** Italian name of the UN geoscheme subregion, e.g. "Europa meridionale". */
  readonly subregion?: string
  /** Area in km². */
  readonly area?: number
  /** Countries sharing a land border. */
  readonly borders: ValueSet<WikidataId>
  /** Whether the country has a sea coast (false = landlocked). */
  readonly seaAccess?: boolean
  readonly highestPoint?: HighestPoint
  /** UTC offsets, e.g. `UTC+01:00`. */
  readonly timeZones: ValueSet<string>

  // Population
  readonly population?: number
  /** Italian demonyms, e.g. "italiano". */
  readonly demonyms: ValueSet<string>

  // Politics
  readonly capitals: ValueSet<Ref>
  /** Forms of government, e.g. "repubblica parlamentare". */
  readonly governmentForms: ValueSet<Ref>
  /** Heads of state and of government, merged into a single set. */
  readonly leaders: ValueSet<Ref>
  /** Year of independence; missing for dependent territories or when not applicable. */
  readonly independenceYear?: number
  readonly organizations: ValueSet<Organization>

  // Miscellaneous
  readonly currencies: ValueSet<Currency>
  readonly officialLanguages: ValueSet<Ref>
  /** International calling codes, e.g. `+39`. */
  readonly callingCodes: ValueSet<string>
  /** Country-code top-level domains, e.g. `.it`. */
  readonly tlds: ValueSet<string>
  readonly drivingSide?: DrivingSide
}

/** Population density in inhabitants per km², or undefined if it cannot be computed. */
export function populationDensity(
  country: Pick<Country, 'population' | 'area'>,
): number | undefined {
  const { population, area } = country
  if (population === undefined || area === undefined || area <= 0) return undefined
  return population / area
}
