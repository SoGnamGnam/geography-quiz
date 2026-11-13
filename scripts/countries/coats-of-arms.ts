// Downloads country coats of arms from Wikimedia Commons into
// public/coats-of-arms/<QID>.webp and records each file's license in
// data/attributions/coats-of-arms.json (the source for THIRD_PARTY.md).

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { WikidataId } from '../../src/domain'
import { downloadAsWebp, fetchFileInfo, type CommonsFileInfo } from '../lib/commons'

export interface CoatOfArmsTarget {
  readonly id: WikidataId
  readonly name: string
  /** Commons file name from Wikidata (P94). */
  readonly file: string
}

export interface Attribution extends Omit<CommonsFileInfo, 'thumbUrl'> {
  readonly id: WikidataId
  readonly name: string
}

export async function buildCoatsOfArms(
  targets: readonly CoatOfArmsTarget[],
  cacheDir: string,
  outDir: string,
  attributionFile: string,
  log: (message: string) => void,
): Promise<Set<WikidataId>> {
  const infos = await fetchFileInfo(
    targets.map((t) => t.file),
    cacheDir,
  )
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const done = new Set<WikidataId>()
  const attributions: Attribution[] = []
  for (const target of targets) {
    const info = infos.get(target.file)
    if (!info) {
      log(`  no Commons metadata for ${target.name}: ${target.file}`)
      continue
    }
    try {
      await downloadAsWebp(info, cacheDir, join(outDir, `${target.id}.webp`))
    } catch (error) {
      log(`  ${target.name}: ${(error as Error).message}`)
      continue
    }
    done.add(target.id)
    attributions.push({
      id: target.id,
      name: target.name,
      file: info.file,
      descriptionUrl: info.descriptionUrl,
      license: info.license,
      licenseUrl: info.licenseUrl,
      artist: info.artist,
      attributionRequired: info.attributionRequired,
    })
  }

  attributions.sort((a, b) => a.name.localeCompare(b.name, 'it'))
  await mkdir(join(attributionFile, '..'), { recursive: true })
  await writeFile(attributionFile, JSON.stringify(attributions, null, 2) + '\n')
  return done
}

/** Markdown table of attributions, for THIRD_PARTY.md. */
export function attributionTable(attributions: readonly Attribution[]): string {
  const cell = (text: string) => text.replaceAll('|', '\\|')
  const rows = attributions.map(
    (a) =>
      `| ${cell(a.name)} | [${cell(a.file)}](${a.descriptionUrl}) | ${cell(a.artist ?? '—')} | ${
        a.licenseUrl ? `[${cell(a.license)}](${a.licenseUrl})` : cell(a.license)
      } |`,
  )
  return ['| Country | File | Author | License |', '| --- | --- | --- | --- |', ...rows].join('\n')
}
