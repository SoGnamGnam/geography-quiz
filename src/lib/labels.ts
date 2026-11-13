// Italian UI copy for engine values.

import type { Notoriety } from '../domain'
import type { DistractorStrategy } from '../engine'

export const DISTRACTOR_LABELS: Record<DistractorStrategy, string> = {
  random: 'Casuali',
  'same-continent': 'Stesso continente',
  similar: 'Molto simili',
}

export const NOTORIETY_LABELS: Record<Notoriety, string> = {
  1: 'Solo i più noti',
  2: 'Noti',
  3: 'Medi',
  4: 'Anche poco noti',
  5: 'Tutti',
}

export const WEIGHT_OPTIONS = [
  { value: 0.5, label: 'Rare' },
  { value: 1, label: 'Normali' },
  { value: 2, label: 'Frequenti' },
] as const

export const TIMER_OPTIONS = [
  { value: 0, label: 'Nessuno' },
  { value: 10, label: '10 s' },
  { value: 20, label: '20 s' },
  { value: 30, label: '30 s' },
  { value: 60, label: '60 s' },
] as const

const dateFormat = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeZone: 'UTC' })

/** "2026-11-13" → "13 novembre 2026". */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return dateFormat.format(new Date(Date.UTC(y!, m! - 1, d!)))
}
