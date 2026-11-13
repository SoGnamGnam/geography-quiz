import { describe, expect, it } from 'vitest'
import type { Ref } from './common'
import { sameRefSet, sameSet, toRefSet, toValueSet } from './sets'

const pretoria: Ref = { id: 'Q3926', name: 'Pretoria' }
const capeTown: Ref = { id: 'Q5465', name: 'Città del Capo' }
const bloemfontein: Ref = { id: 'Q37701', name: 'Bloemfontein' }

describe('sameSet', () => {
  it('ignores order', () => {
    expect(sameSet(['it', 'fr', 'de'], ['de', 'it', 'fr'])).toBe(true)
  })

  it('rejects subsets and supersets', () => {
    expect(sameSet(['it', 'fr'], ['it', 'fr', 'de'])).toBe(false)
    expect(sameSet(['it', 'fr', 'de'], ['it', 'fr'])).toBe(false)
  })

  it('rejects sets of equal size with different values', () => {
    expect(sameSet(['it', 'fr'], ['it', 'es'])).toBe(false)
  })

  it('treats two empty sets as equal', () => {
    expect(sameSet([], [])).toBe(true)
  })
})

describe('sameRefSet', () => {
  it('matches the full set of South African capitals in any order', () => {
    expect(sameRefSet([pretoria, capeTown, bloemfontein], [bloemfontein, pretoria, capeTown])).toBe(
      true,
    )
  })

  it('rejects a partial answer', () => {
    expect(sameRefSet([pretoria, capeTown, bloemfontein], [pretoria])).toBe(false)
  })

  it('compares by id, not by label', () => {
    expect(sameRefSet([pretoria], [{ id: 'Q3926', name: 'Tshwane' }])).toBe(true)
  })
})

describe('toValueSet / toRefSet', () => {
  it('removes duplicate values', () => {
    expect(toValueSet(['+39', '+39', '+378'])).toEqual(['+39', '+378'])
  })

  it('removes duplicate references by id, keeping the first label', () => {
    expect(toRefSet([pretoria, { id: 'Q3926', name: 'Tshwane' }, capeTown])).toEqual([
      pretoria,
      capeTown,
    ])
  })
})
