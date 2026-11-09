// Writes history/<date>.json: each town item's state, labels and buildings, and each building's state and counts,
// so the town can be played back later (GitHub keeps no history for labels). Skips writing when nothing changed
// since the newest file. Usage: node scripts/town/history.mjs [outDir] (default: history/).
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { snapshot, town } from './load.mjs'

const repoDir = new URL('../../history/', import.meta.url).pathname
const outDir = resolve(process.argv[2] ?? repoDir)
const date = snapshot.generatedAt.slice(0, 10)

const items = {}
for (const n of Object.values(town.nodes))
  for (const i of n.items) {
    const s = snapshot.items[i.key]
    items[i.key] ??= { state: s.state, kind: i.kind, labels: s.labels, nodes: [] }
    items[i.key].nodes.push(n.id)
  }
const record = {
  date,
  generatedAt: snapshot.generatedAt,
  nodes: Object.fromEntries(Object.values(town.nodes).map((n) => [n.id, { state: n.state, ...n.counts }])),
  items: Object.fromEntries(Object.entries(items).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))),
}

const files = (await readdir(repoDir).catch(() => [])).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
const body = (r) => JSON.stringify({ ...r, date: undefined, generatedAt: undefined })
const last = files.at(-1) && JSON.parse(await readFile(resolve(repoDir, files.at(-1)), 'utf8'))
if (last && body(last) === body(record)) {
  console.error(`history: unchanged since ${files.at(-1)}`)
} else {
  await mkdir(outDir, { recursive: true })
  const text = JSON.stringify(record) + '\n'
  await writeFile(resolve(outDir, `${date}.json`), text)
  console.error(`history: wrote ${date}.json (${Object.keys(items).length} items, ${Math.round(text.length / 1024)} KB)`)
}
