// Generates one silhouette SVG per country from Natural Earth borders
// (public domain). Output: public/silhouettes/<QID>.svg, a single filled path
// using `currentColor`, so the UI chooses the colour.
//
// Far-away parts are dropped so the shape is recognizable: the main landmass
// is kept, plus every part within MAX_GAP_KM of a part already kept (France
// keeps Corsica but not French Guiana; the US keeps neither Alaska nor Hawaii).

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoDistance } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'
import type { WikidataId } from '../../src/domain'

const NATURAL_EARTH_VERSION = 'v5.1.2'
const SOURCES = ['ne_10m_admin_0_countries', 'ne_10m_admin_0_map_units'] as const

const SIZE = 256
const PADDING = 8
/** Douglas–Peucker tolerance in output pixels. */
const TOLERANCE = 0.6
const EARTH_RADIUS_KM = 6371
const MAX_GAP_KM = 800

type Shape = Feature<Polygon | MultiPolygon, Record<string, unknown>>

export interface SilhouetteTarget {
  readonly id: WikidataId
  readonly iso3?: string
}

async function loadSource(cacheDir: string, name: string): Promise<Shape[]> {
  const file = join(cacheDir, `${name}.geojson`)
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch {
    const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_VERSION}/geojson/${name}.geojson`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Download failed: ${url} (${response.status})`)
    text = await response.text()
    await mkdir(cacheDir, { recursive: true })
    await writeFile(file, text)
  }
  return (JSON.parse(text) as FeatureCollection<Polygon | MultiPolygon>).features as Shape[]
}

/** Finds the Natural Earth feature for a country: Wikidata ID first, then ISO alpha-3. */
function findShape(sources: Shape[][], target: SilhouetteTarget): Shape | undefined {
  for (const features of sources) {
    const match = features.find((f) => f.properties.WIKIDATAID === target.id)
    if (match) return match
  }
  if (!target.iso3) return undefined
  for (const features of sources) {
    const match = features.find(
      (f) => f.properties.ISO_A3_EH === target.iso3 || f.properties.ADM0_A3 === target.iso3,
    )
    if (match) return match
  }
  return undefined
}

/** Keeps the largest part and every part chained to it within MAX_GAP_KM. */
export function nearbyParts(polygons: Position[][][]): Position[][][] {
  if (polygons.length <= 1) return polygons
  const parts = polygons.map((coordinates) => {
    const polygon: Polygon = { type: 'Polygon', coordinates }
    return { coordinates, area: geoArea(polygon), centroid: geoCentroid(polygon) }
  })
  parts.sort((a, b) => b.area - a.area)
  const kept = [parts[0]!]
  const pending = parts.slice(1)
  const maxGap = MAX_GAP_KM / EARTH_RADIUS_KM
  for (let added = true; added;) {
    added = false
    for (let i = pending.length - 1; i >= 0; i--) {
      const part = pending[i]!
      if (kept.some((k) => geoDistance(k.centroid, part.centroid) <= maxGap)) {
        kept.push(part)
        pending.splice(i, 1)
        added = true
      }
    }
  }
  return kept.map((part) => part.coordinates)
}

/** Ramer–Douglas–Peucker simplification of a closed ring, in planar coordinates. */
export function simplifyRing(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length <= 4) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [start, end] = stack.pop()!
    const [ax, ay] = points[start]!
    const [bx, by] = points[end]!
    const dx = bx - ax
    const dy = by - ay
    const length = Math.hypot(dx, dy)
    let maxDistance = 0
    let index = -1
    for (let i = start + 1; i < end; i++) {
      const [px, py] = points[i]!
      const distance =
        length === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs(dy * px - dx * py + bx * ay - by * ax) / length
      if (distance > maxDistance) {
        maxDistance = distance
        index = i
      }
    }
    if (index !== -1 && maxDistance > tolerance) {
      keep[index] = 1
      stack.push([start, index], [index, end])
    }
  }
  return points.filter((_, i) => keep[i])
}

function ringArea(points: [number, number][]): number {
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += (points[j]![0] - points[i]![0]) * (points[j]![1] + points[i]![1])
  }
  return Math.abs(sum / 2)
}

/** Renders the polygons as an SVG document, or undefined if nothing visible remains. */
export function renderSilhouette(polygons: Position[][][]): string | undefined {
  const multi: MultiPolygon = { type: 'MultiPolygon', coordinates: polygons }
  // Equal-area projection centred on the shape: little distortion, and no
  // antimeridian problems (Russia, Fiji…) because the centre is rotated.
  const [lon, lat] = geoCentroid(multi)
  const projection = geoAzimuthalEqualArea()
    .rotate([-lon, -lat])
    .fitExtent(
      [
        [PADDING, PADDING],
        [SIZE - PADDING, SIZE - PADDING],
      ],
      multi,
    )

  const round = (n: number) => Math.round(n * 10) / 10
  let d = ''
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const projected = ring
        .map((p) => projection([p[0]!, p[1]!]))
        .filter((p): p is [number, number] => p !== null)
      const simplified = simplifyRing(projected, TOLERANCE)
      if (simplified.length < 4 || ringArea(simplified) < 1) continue
      const [first, ...rest] = simplified.slice(0, -1).map(([x, y]) => `${round(x)} ${round(y)}`)
      d += `M${first}L${rest.join(' ')}Z`
    }
  }
  if (!d) return undefined
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>\n`
}

/**
 * Writes a silhouette for every target Natural Earth has a shape for, and
 * returns the IDs that got one. Old files in `outDir` are removed first.
 */
export async function buildSilhouettes(
  targets: readonly SilhouetteTarget[],
  cacheDir: string,
  outDir: string,
): Promise<Set<WikidataId>> {
  const sources = await Promise.all(SOURCES.map((name) => loadSource(cacheDir, name)))
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const done = new Set<WikidataId>()
  for (const target of targets) {
    const shape = findShape(sources, target)
    if (!shape) continue
    const polygons =
      shape.geometry.type === 'Polygon' ? [shape.geometry.coordinates] : shape.geometry.coordinates
    const svg = renderSilhouette(nearbyParts(polygons))
    if (!svg) continue
    await writeFile(join(outDir, `${target.id}.svg`), svg)
    done.add(target.id)
  }
  return done
}
