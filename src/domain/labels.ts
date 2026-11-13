import type { Continent, CountryCategory, DrivingSide, Organization } from './country'

// Italian display labels for the domain enums. The data stores stable English
// codes; the UI shows these labels.

export const COUNTRY_CATEGORY_LABELS: Record<CountryCategory, string> = {
  'un-member': 'Stato membro ONU',
  'un-observer': 'Stato osservatore ONU',
  'partially-recognized': 'Stato a riconoscimento limitato',
  'dependent-territory': 'Territorio dipendente',
}

export const CONTINENT_LABELS: Record<Continent, string> = {
  africa: 'Africa',
  antarctica: 'Antartide',
  asia: 'Asia',
  europe: 'Europa',
  'north-america': 'America settentrionale',
  oceania: 'Oceania',
  'south-america': 'America meridionale',
}

export const DRIVING_SIDE_LABELS: Record<DrivingSide, string> = {
  left: 'sinistra',
  right: 'destra',
}

export const ORGANIZATION_LABELS: Record<Organization, string> = {
  un: 'ONU',
  eu: 'Unione europea',
  nato: 'NATO',
  'african-union': 'Unione africana',
  asean: 'ASEAN',
  commonwealth: 'Commonwealth delle nazioni',
  mercosur: 'Mercosur',
  opec: 'OPEC',
  g7: 'G7',
  g20: 'G20',
}
