// Downloads images from Wikimedia Commons with their license metadata.
// Used for coats of arms now, and region flags later (M7).
//
// Images are fetched as PNG thumbnails at a standard Commons width (330px),
// then shrunk and re-encoded as WebP so the offline bundle stays small.
// Downloads are cached in scripts/.cache/commons/ (git-ignored).

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const API = 'https://commons.wikimedia.org/w/api.php'
const USER_AGENT = process.env.WIKIDATA_USER_AGENT ?? 'geo-data-pipeline/0.1 (build script)'
/** One of the thumbnail widths Wikimedia pre-renders; other widths are rate-limited. */
const THUMB_WIDTH = 330

export interface CommonsFileInfo {
  /** File name without the `File:` prefix, e.g. `Emblem of Italy.svg`. */
  readonly file: string
  readonly descriptionUrl: string
  readonly thumbUrl: string
  /** Short license name, e.g. "Public domain" or "CC BY-SA 4.0". */
  readonly license: string
  readonly licenseUrl?: string
  /** Author as plain text (HTML stripped). */
  readonly artist?: string
  readonly attributionRequired: boolean
}

interface ApiPage {
  readonly title: string
  readonly missing?: boolean
  readonly imageinfo?: readonly {
    readonly thumburl?: string
    readonly descriptionurl: string
    readonly extmetadata?: Readonly<Record<string, { readonly value: string } | undefined>>
  }[]
}

/** Turns the HTML that Commons returns for authors into one line of plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function getJson(params: Record<string, string>, cacheDir: string): Promise<unknown> {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', ...params })
  const key = createHash('sha256').update(query.toString()).digest('hex').slice(0, 32)
  const cacheFile = join(cacheDir, 'api', `${key}.json`)
  try {
    return JSON.parse(await readFile(cacheFile, 'utf8'))
  } catch {
    // Not cached.
  }
  const response = await fetch(`${API}?${query}`, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Commons API failed: ${response.status}`)
  const text = await response.text()
  await mkdir(join(cacheDir, 'api'), { recursive: true })
  await writeFile(cacheFile, text)
  return JSON.parse(text)
}

/** Fetches license metadata and thumbnail URLs, 50 files per request. */
export async function fetchFileInfo(
  files: readonly string[],
  cacheDir: string,
): Promise<Map<string, CommonsFileInfo>> {
  const result = new Map<string, CommonsFileInfo>()
  const unique = [...new Set(files)]
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50)
    const json = (await getJson(
      {
        action: 'query',
        titles: batch.map((f) => `File:${f}`).join('|'),
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: String(THUMB_WIDTH),
        iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|AttributionRequired',
      },
      cacheDir,
    )) as { query?: { pages?: ApiPage[]; normalized?: { from: string; to: string }[] } }

    const byTitle = new Map((json.query?.pages ?? []).map((page) => [page.title, page]))
    const normalized = new Map((json.query?.normalized ?? []).map((n) => [n.from, n.to]))
    for (const file of batch) {
      const title = normalized.get(`File:${file}`) ?? `File:${file}`
      const page = byTitle.get(title)
      const info = page?.imageinfo?.[0]
      if (!info?.thumburl) continue
      const meta = info.extmetadata ?? {}
      const artist = meta.Artist ? htmlToText(meta.Artist.value) : undefined
      result.set(file, {
        file,
        descriptionUrl: info.descriptionurl,
        thumbUrl: info.thumburl.split('?')[0]!,
        license: meta.LicenseShortName ? htmlToText(meta.LicenseShortName.value) : 'Unknown',
        licenseUrl: meta.LicenseUrl?.value,
        artist: artist ? artist.slice(0, 300) : undefined,
        attributionRequired: meta.AttributionRequired?.value === 'true',
      })
    }
  }
  return result
}

/**
 * Downloads a thumbnail (cached) and writes it as WebP, fitted inside a
 * `size`×`size` box with a transparent background.
 */
export async function downloadAsWebp(
  info: CommonsFileInfo,
  cacheDir: string,
  outFile: string,
  size = 200,
): Promise<void> {
  const key = createHash('sha256').update(info.thumbUrl).digest('hex').slice(0, 32)
  const cacheFile = join(cacheDir, 'files', `${key}.png`)
  let png: Buffer
  try {
    png = await readFile(cacheFile)
  } catch {
    const response = await fetch(info.thumbUrl, { headers: { 'User-Agent': USER_AGENT } })
    if (!response.ok) throw new Error(`Download failed (${response.status}): ${info.thumbUrl}`)
    png = Buffer.from(await response.arrayBuffer())
    await mkdir(join(cacheDir, 'files'), { recursive: true })
    await writeFile(cacheFile, png)
    // Be gentle with Wikimedia's servers.
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  await sharp(png)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85, alphaQuality: 90 })
    .toFile(outFile)
}
