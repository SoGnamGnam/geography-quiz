// Many dependent territories use their parent state's flag (French overseas
// territories, Svalbard, Heard Island…). flag-icons ships a file for each of
// them, but a flag question about them would be unanswerable, so their flag is
// dropped. Flags are compared by rendering them small and diffing the pixels,
// since the SVG sources differ even when the pictures are the same.

import { join } from 'node:path'
import sharp from 'sharp'
import type { Country, WikidataId } from '../../src/domain'

/** Mean absolute difference per channel (0–255) below which two flags count as the same. */
const SAME_FLAG_THRESHOLD = 5

async function thumbnail(flagsDir: string, code: string): Promise<Buffer> {
  return sharp(join(flagsDir, `${code}.svg`))
    .resize(40, 30, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer()
}

export function pixelDifference(a: Buffer, b: Buffer): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i]! - b[i]!)
  return sum / a.length
}

/** IDs of dependent territories whose flag looks the same as another country's. */
export async function findSharedFlags(
  countries: readonly Country[],
  flagsDir: string,
): Promise<Set<WikidataId>> {
  const withFlag = countries.filter((c) => c.flag)
  const images = await Promise.all(withFlag.map((c) => thumbnail(flagsDir, c.flag!)))
  const shared = new Set<WikidataId>()
  for (let i = 0; i < withFlag.length; i++) {
    for (let j = i + 1; j < withFlag.length; j++) {
      if (pixelDifference(images[i]!, images[j]!) >= SAME_FLAG_THRESHOLD) continue
      for (const country of [withFlag[i]!, withFlag[j]!]) {
        if (country.category === 'dependent-territory') shared.add(country.id)
      }
    }
  }
  return shared
}
