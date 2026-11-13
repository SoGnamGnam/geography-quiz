// Small hand-made dataset for the engine tests. Values are rounded and only
// need to be plausible; the real data is covered by data.test.ts.

import type { Continent, Country, Notoriety, WikidataId } from '../domain'
import type { QuizData } from './types'

interface Spec {
  id: WikidataId
  name: string
  continent: Continent
  capitals: [WikidataId, string][]
  borders?: WikidataId[]
  area: number
  population: number
  lat: number
  lon: number
  notoriety?: Notoriety
  flag?: string | null
  leaders?: [WikidataId, string][]
}

function country(spec: Spec): Country {
  return {
    id: spec.id,
    name: spec.name,
    aliases: [],
    notoriety: spec.notoriety ?? 1,
    coordinates: { lat: spec.lat, lon: spec.lon },
    category: 'un-member',
    flag: spec.flag === null ? undefined : (spec.flag ?? spec.name.slice(0, 2).toLowerCase()),
    silhouette: spec.id,
    coatOfArms: spec.id,
    continents: [spec.continent],
    area: spec.area,
    borders: spec.borders ?? [],
    timeZones: [],
    population: spec.population,
    demonyms: [],
    capitals: spec.capitals.map(([id, name]) => ({ id, name })),
    governmentForms: [],
    leaders: (spec.leaders ?? [[`Q9${spec.id.slice(1)}` as WikidataId, `Leader ${spec.name}`]]).map(
      ([id, name]) => ({ id, name }),
    ),
    organizations: [],
    currencies: [],
    officialLanguages: [],
    callingCodes: [],
    tlds: [],
  }
}

export const COUNTRIES: readonly Country[] = [
  country({
    id: 'Q38',
    name: 'Italia',
    continent: 'europe',
    capitals: [['Q220', 'Roma']],
    borders: ['Q142', 'Q39', 'Q40'],
    area: 302_000,
    population: 59_000_000,
    lat: 42.5,
    lon: 12.5,
  }),
  country({
    id: 'Q142',
    name: 'Francia',
    continent: 'europe',
    capitals: [['Q90', 'Parigi']],
    borders: ['Q38', 'Q39', 'Q183', 'Q29'],
    area: 551_000,
    population: 68_000_000,
    lat: 46.6,
    lon: 2.4,
  }),
  country({
    id: 'Q39',
    name: 'Svizzera',
    continent: 'europe',
    capitals: [['Q70', 'Berna']],
    borders: ['Q38', 'Q142', 'Q183', 'Q40'],
    area: 41_000,
    population: 9_000_000,
    lat: 46.8,
    lon: 8.2,
  }),
  country({
    id: 'Q40',
    name: 'Austria',
    continent: 'europe',
    capitals: [['Q1741', 'Vienna']],
    borders: ['Q38', 'Q39', 'Q183'],
    area: 84_000,
    population: 9_100_000,
    lat: 47.6,
    lon: 14.1,
  }),
  country({
    id: 'Q183',
    name: 'Germania',
    continent: 'europe',
    capitals: [['Q64', 'Berlino']],
    borders: ['Q142', 'Q39', 'Q40'],
    area: 357_000,
    population: 84_000_000,
    lat: 51.2,
    lon: 10.4,
  }),
  country({
    id: 'Q29',
    name: 'Spagna',
    continent: 'europe',
    capitals: [['Q2807', 'Madrid']],
    borders: ['Q142', 'Q45'],
    area: 506_000,
    population: 48_000_000,
    lat: 40.4,
    lon: -3.7,
  }),
  country({
    id: 'Q45',
    name: 'Portogallo',
    continent: 'europe',
    capitals: [['Q597', 'Lisbona']],
    borders: ['Q29'],
    area: 92_000,
    population: 10_400_000,
    lat: 39.4,
    lon: -8.2,
    notoriety: 2,
  }),
  country({
    id: 'Q235',
    name: 'Monaco',
    continent: 'europe',
    capitals: [['Q235001', 'Monaco']],
    borders: ['Q142'],
    area: 2,
    population: 38_000,
    lat: 43.7,
    lon: 7.4,
    notoriety: 3,
  }),
  country({
    id: 'Q258',
    name: 'Sudafrica',
    continent: 'africa',
    capitals: [
      ['Q3926', 'Pretoria'],
      ['Q5465', 'Città del Capo'],
      ['Q37701', 'Bloemfontein'],
    ],
    area: 1_220_000,
    population: 62_000_000,
    lat: -29,
    lon: 24,
  }),
  country({
    id: 'Q79',
    name: 'Egitto',
    continent: 'africa',
    capitals: [['Q85', 'Il Cairo']],
    area: 1_010_000,
    population: 105_000_000,
    lat: 26.8,
    lon: 30.8,
  }),
  country({
    id: 'Q114',
    name: 'Kenya',
    continent: 'africa',
    capitals: [['Q3870', 'Nairobi']],
    area: 580_000,
    population: 54_000_000,
    lat: 0,
    lon: 38,
    notoriety: 2,
  }),
  country({
    id: 'Q657',
    name: 'Ciad',
    continent: 'africa',
    capitals: [['Q3659', "N'Djamena"]],
    area: 1_284_000,
    population: 18_000_000,
    lat: 15,
    lon: 19,
    notoriety: 4,
  }),
  country({
    id: 'Q750',
    name: 'Bolivia',
    continent: 'south-america',
    capitals: [
      ['Q1491', 'La Paz'],
      ['Q2907', 'Sucre'],
    ],
    borders: ['Q155', 'Q414'],
    area: 1_098_000,
    population: 12_000_000,
    lat: -17,
    lon: -65,
  }),
  country({
    id: 'Q155',
    name: 'Brasile',
    continent: 'south-america',
    capitals: [['Q2844', 'Brasilia']],
    borders: ['Q750', 'Q414'],
    area: 8_516_000,
    population: 203_000_000,
    lat: -10,
    lon: -55,
  }),
  country({
    id: 'Q414',
    name: 'Argentina',
    continent: 'south-america',
    capitals: [['Q1486', 'Buenos Aires']],
    borders: ['Q750', 'Q155'],
    area: 2_780_000,
    population: 46_000_000,
    lat: -34,
    lon: -64,
  }),
  country({
    id: 'Q17',
    name: 'Giappone',
    continent: 'asia',
    capitals: [['Q1490', 'Tokyo']],
    area: 378_000,
    population: 124_000_000,
    lat: 36,
    lon: 138,
  }),
  country({
    id: 'Q148',
    name: 'Cina',
    continent: 'asia',
    capitals: [['Q956', 'Pechino']],
    borders: ['Q668'],
    area: 9_597_000,
    population: 1_410_000_000,
    lat: 35,
    lon: 103,
  }),
  country({
    id: 'Q668',
    name: 'India',
    continent: 'asia',
    capitals: [['Q987', 'Nuova Delhi']],
    borders: ['Q148'],
    area: 3_287_000,
    population: 1_430_000_000,
    lat: 21,
    lon: 78,
  }),
  country({
    id: 'Q252',
    name: 'Indonesia',
    continent: 'asia',
    capitals: [['Q3630', 'Giacarta']],
    area: 1_905_000,
    population: 278_000_000,
    lat: -2,
    lon: 118,
    flag: 'id',
  }),
  country({
    id: 'Q218',
    name: 'Romania',
    continent: 'europe',
    capitals: [['Q19660', 'Bucarest']],
    area: 238_000,
    population: 19_000_000,
    lat: 46,
    lon: 25,
    notoriety: 2,
  }),
  country({
    id: 'Q408',
    name: 'Australia',
    continent: 'oceania',
    capitals: [['Q3114', 'Canberra']],
    area: 7_692_000,
    population: 27_000_000,
    lat: -25,
    lon: 133,
    leaders: [
      ['Q43274', 'Carlo III'],
      ['Q434706', 'Anthony Albanese'],
    ],
  }),
  country({
    id: 'Q672',
    name: 'Tuvalu',
    continent: 'oceania',
    capitals: [['Q34126', 'Funafuti']],
    area: 26,
    population: 11_000,
    lat: -8,
    lon: 178,
    notoriety: 5,
    flag: null,
  }),
]

export const DATA: QuizData = { countries: COUNTRIES, snapshotDate: '2026-11-01' }

export const byId = (id: WikidataId): Country => {
  const found = COUNTRIES.find((c) => c.id === id)
  if (!found) throw new Error(`No fixture ${id}`)
  return found
}
