import { describe, expect, it } from 'vitest'
import { createRng } from './rng'

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    )
  })

  it('differs between seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next())
  })

  it('returns floats in [0, 1) and integers in [0, max)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const f = rng.next()
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
      const n = rng.int(6)
      expect(Number.isInteger(n) && n >= 0 && n < 6).toBe(true)
    }
  })

  it('shuffles into a permutation without changing the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const shuffled = createRng(3).shuffle(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...shuffled].sort()).toEqual(input)
  })

  it('picks by weight, never choosing a zero weight', () => {
    const rng = createRng(11)
    const counts = [0, 0, 0]
    for (let i = 0; i < 3000; i++) counts[rng.weightedIndex([1, 0, 3])]!++
    expect(counts[1]).toBe(0)
    expect(counts[2]! / counts[0]!).toBeGreaterThan(2)
    expect(counts[2]! / counts[0]!).toBeLessThan(4)
    expect(rng.weightedIndex([0, 0])).toBe(-1)
  })

  it('throws when picking from an empty array', () => {
    expect(() => createRng(1).pick([])).toThrow()
  })
})
