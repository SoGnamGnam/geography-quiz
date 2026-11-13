import type { Ref, ValueSet } from './common'

/** Whether two sets hold the same values, ignoring order. */
export function sameSet<T>(a: ValueSet<T>, b: ValueSet<T>): boolean {
  if (a.length !== b.length) return false
  const other = new Set(b)
  return a.every((value) => other.has(value))
}

/** Whether two sets of references point to the same items, ignoring order and labels. */
export function sameRefSet(a: ValueSet<Ref>, b: ValueSet<Ref>): boolean {
  return sameSet(
    a.map((ref) => ref.id),
    b.map((ref) => ref.id),
  )
}

/** Removes duplicates, keeping the first occurrence. Used by the pipeline. */
export function toValueSet<T>(values: Iterable<T>): ValueSet<T> {
  return [...new Set(values)]
}

/** Removes references to the same item, keeping the first occurrence. */
export function toRefSet<R extends Ref>(refs: Iterable<R>): ValueSet<R> {
  const seen = new Set<string>()
  const result: R[] = []
  for (const ref of refs) {
    if (seen.has(ref.id)) continue
    seen.add(ref.id)
    result.push(ref)
  }
  return result
}
