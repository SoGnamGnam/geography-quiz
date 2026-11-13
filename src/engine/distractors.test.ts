import { describe, expect, it } from 'vitest'
import { distanceKm, orderCandidates } from './distractors'
import { applyFilters, withinNotoriety } from './filters'
import { COUNTRIES, byId } from './fixtures'
import { createRng } from './rng'

describe('distanceKm', () => {
  it('is roughly right for Rome–Paris', () => {
    expect(distanceKm(byId('Q38'), byId('Q142'))).toBeGreaterThan(800)
    expect(distanceKm(byId('Q38'), byId('Q142'))).toBeLessThan(1300)
  })
})

describe('orderCandidates', () => {
  const italy = byId('Q38')

  it('never includes the subject', () => {
    for (const strategy of ['random', 'same-continent', 'similar'] as const) {
      const order = orderCandidates(italy, COUNTRIES, strategy, createRng(1))
      expect(order.map((c) => c.id)).not.toContain('Q38')
      expect(order).toHaveLength(COUNTRIES.length - 1)
    }
  })

  it('same-continent puts countries of the same continent first', () => {
    const order = orderCandidates(italy, COUNTRIES, 'same-continent', createRng(2))
    const european = COUNTRIES.filter((c) => c.continents.includes('europe')).length - 1
    expect(order.slice(0, european).every((c) => c.continents.includes('europe'))).toBe(true)
    expect(order.slice(european).some((c) => c.continents.includes('europe'))).toBe(false)
  })

  it('similar puts bordering and nearby countries first', () => {
    const order = orderCandidates(italy, COUNTRIES, 'similar', createRng(3), undefined, 3)
    const firstWindow = order.slice(0, 6).map((c) => c.id)
    for (const neighbour of ['Q142', 'Q39', 'Q40']) expect(firstWindow).toContain(neighbour)
    expect(firstWindow).not.toContain('Q408') // Australia
  })
})

describe('filters', () => {
  it('filters by continent and category (empty = everything)', () => {
    expect(applyFilters(COUNTRIES, { continents: [], categories: [] })).toHaveLength(
      COUNTRIES.length,
    )
    const african = applyFilters(COUNTRIES, { continents: ['africa'], categories: [] })
    expect(african.map((c) => c.name).sort()).toEqual(['Ciad', 'Egitto', 'Kenya', 'Sudafrica'])
    expect(applyFilters(COUNTRIES, { continents: [], categories: ['un-observer'] })).toEqual([])
  })

  it('keeps entities up to the notoriety threshold', () => {
    expect(withinNotoriety(COUNTRIES, 5)).toHaveLength(COUNTRIES.length)
    expect(withinNotoriety(COUNTRIES, 1).every((c) => c.notoriety === 1)).toBe(true)
  })
})
