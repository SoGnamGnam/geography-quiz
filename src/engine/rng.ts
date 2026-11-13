// Seeded pseudo-random number generator, so a quiz can be reproduced from its
// seed (in tests, and to replay a quiz). Not suitable for cryptography.

export interface Rng {
  /** A float in [0, 1). */
  next(): number
  /** An integer in [0, max). */
  int(max: number): number
  /** A random element; throws on an empty array. */
  pick<T>(items: readonly T[]): T
  /** A shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[]
  /** Index chosen with probability proportional to its weight; -1 if all weights are 0. */
  weightedIndex(weights: readonly number[]): number
}

/** Mulberry32: tiny, fast, and good enough for shuffling quiz questions. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (max: number) => Math.floor(next() * max)

  return {
    next,
    int,
    pick(items) {
      if (items.length === 0) throw new Error('pick: empty array')
      return items[int(items.length)]!
    },
    shuffle(items) {
      const result = [...items]
      for (let i = result.length - 1; i > 0; i--) {
        const j = int(i + 1)
        ;[result[i], result[j]] = [result[j]!, result[i]!]
      }
      return result
    },
    weightedIndex(weights) {
      const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0)
      if (total <= 0) return -1
      let threshold = next() * total
      for (let i = 0; i < weights.length; i++) {
        threshold -= Math.max(0, weights[i]!)
        if (threshold < 0) return i
      }
      return weights.length - 1
    },
  }
}

/** A random seed for a new quiz (not reproducible, by design). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32)
}
