import { describe, expect, it } from 'vitest'
import { attributionTable } from '../countries/coats-of-arms'
import { htmlToText } from './commons'

describe('htmlToText', () => {
  it('strips tags, decodes entities and collapses whitespace', () => {
    expect(
      htmlToText('<p>Redo by <a href="x">User:-xfi-</a>\n</p><ul><li>A &amp; B</li></ul>'),
    ).toBe('Redo by User:-xfi- A & B')
  })
})

describe('attributionTable', () => {
  it('renders one row per file and escapes pipes', () => {
    const table = attributionTable([
      {
        id: 'Q38',
        name: 'Italia',
        file: 'Emblem of Italy.svg',
        descriptionUrl: 'https://commons.wikimedia.org/wiki/File:Emblem_of_Italy.svg',
        license: 'Public domain',
        artist: 'A | B',
        attributionRequired: false,
      },
    ])
    const lines = table.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[2]).toContain('A \\| B')
  })
})
