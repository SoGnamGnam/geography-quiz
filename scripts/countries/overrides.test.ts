import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseOverrides } from './overrides'

describe('parseOverrides', () => {
  it('accepts a valid file and skips $-prefixed keys', () => {
    const overrides = parseOverrides({
      $comment: 'ignored',
      Q38: { notoriety: 1, aliases: ['Belpaese'], note: 'Italy' },
      Q51: { exclude: true },
    })
    expect(overrides.size).toBe(2)
    expect(overrides.get('Q38')?.notoriety).toBe(1)
  })

  it.each([
    [{ Italy: {} }, /not a Wikidata ID/],
    [{ Q38: { notoriety: 6 } }, /notoriety/],
    [{ Q38: { category: 'state' } }, /category/],
    [{ Q38: { aliases: 'Belpaese' } }, /aliases/],
    [{ Q38: { include: true, exclude: true } }, /both include and exclude/],
    [{ Q38: { nmae: 'Italia' } }, /unknown field "nmae"/],
    [[], /expected an object/],
  ])('rejects malformed input %j', (input, message) => {
    expect(() => parseOverrides(input)).toThrow(message)
  })

  it('parses the committed overrides file', () => {
    const file = join(import.meta.dirname, '..', '..', 'overrides', 'countries.json')
    expect(() => parseOverrides(JSON.parse(readFileSync(file, 'utf8')))).not.toThrow()
  })
})
