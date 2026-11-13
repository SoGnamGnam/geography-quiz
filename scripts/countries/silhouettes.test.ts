import { describe, expect, it } from 'vitest'
import type { Position } from 'geojson'
import { nearbyParts, renderSilhouette, simplifyRing } from './silhouettes'

/** A small square polygon (one ring) centred on lon/lat. */
function square(lon: number, lat: number, half = 0.5): Position[][] {
  return [
    [
      [lon - half, lat - half],
      [lon - half, lat + half],
      [lon + half, lat + half],
      [lon + half, lat - half],
      [lon - half, lat - half],
    ],
  ]
}

describe('nearbyParts', () => {
  it('keeps the main part and nearby islands, dropping far-away ones', () => {
    const mainland = square(2, 46, 4)
    const nearIsland = square(9, 42) // ~600 km away (like Corsica)
    const farIsland = square(-53, 4) // South America (like French Guiana)
    const kept = nearbyParts([nearIsland, farIsland, mainland])
    expect(kept).toHaveLength(2)
    expect(kept[0]).toBe(mainland)
    expect(kept).toContain(nearIsland)
  })

  it('chains islands: each one only needs to be near a part already kept', () => {
    const parts = [square(0, 0, 2), square(6, 0), square(12, 0), square(18, 0)]
    expect(nearbyParts(parts)).toHaveLength(4)
  })
})

describe('simplifyRing', () => {
  it('drops points that are almost collinear', () => {
    const ring: [number, number][] = [
      [0, 0],
      [5, 0.1],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ]
    expect(simplifyRing(ring, 0.5)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ])
  })

  it('keeps points farther than the tolerance', () => {
    const ring: [number, number][] = [
      [0, 0],
      [5, 3],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ]
    expect(simplifyRing(ring, 0.5)).toHaveLength(6)
  })
})

describe('renderSilhouette', () => {
  it('renders a single currentColor path inside a 256×256 viewBox', () => {
    const svg = renderSilhouette([square(12, 42, 3)])!
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 256 256"/)
    expect(svg.match(/<path /g)).toHaveLength(1)
    expect(svg).toContain('fill="currentColor"')
  })

  it('handles shapes crossing the antimeridian', () => {
    const svg = renderSilhouette([square(179.5, -17), square(-179.5, -17)])!
    const path = svg.match(/ d="([^"]+)"/)![1]!
    const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...numbers)).toBeLessThanOrEqual(256)
  })
})
