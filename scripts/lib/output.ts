import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Dataset } from '../../src/domain'

/**
 * Writes a dataset as JSON with one entity per line: compact enough to ship,
 * and the monthly regeneration PR shows a readable per-entity diff.
 */
export function serializeDataset(dataset: Dataset): string {
  const { entities, ...envelope } = dataset
  const head = JSON.stringify(envelope).slice(0, -1)
  const lines = entities.map((entity) => JSON.stringify(entity)).join(',\n')
  return `${head},"entities":[\n${lines}\n]}\n`
}

export async function writeDataset(path: string, dataset: Dataset): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, serializeDataset(dataset))
}
