// Lists items the page shows that have no plain-words title yet, or whose GitHub title changed since.
// Output is JSON an agent (or a person) can fill in and merge into content/plain-words.json.
import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'

const snapshot = JSON.parse(await readFile(new URL('../src/data/snapshot.json', import.meta.url)))
const plain = JSON.parse(await readFile(new URL('../content/plain-words.json', import.meta.url)))
const since = snapshot.since

const shown = Object.values(snapshot.items).filter(
  (i) =>
    !i.bot &&
    (snapshot.summit.items.includes(i.key) ||
      (i.kind === 'pr' && i.state === 'open') ||
      (i.closedAt && i.closedAt >= since && i.stateReason !== 'not_planned' && i.state !== 'closed') ||
      (i.kind === 'issue' && i.closedAt && i.closedAt >= since && i.stateReason !== 'not_planned')),
)
const config = parse(await readFile(new URL('../trailmap.config.yaml', import.meta.url), 'utf8'))
const extra = new Set([
  ...snapshot.forum.flatMap((t) => t.refs),
  ...config.river.flatMap((g) => g.issues),
])
for (const key of extra) if (snapshot.items[key]) shown.push(snapshot.items[key])
// Then the town's items, fires first, since CI titles at most 100 per run.
const { town } = await import('./town/load.mjs')
const rank = { fire: 0, bug: 1, work: 2, done: 3 }
const townItems = [...new Map(Object.values(town.nodes).flatMap((n) => n.items.map((i) => [i.key, i]))).values()]
for (const i of townItems.sort((a, b) => rank[a.kind] - rank[b.kind])) shown.push(snapshot.items[i.key])

const todo = {}
for (const i of new Set(shown)) {
  const p = plain[i.key]
  if (!p || p.for !== i.title) todo[i.key] = { github: i.title, url: i.url, labels: i.labels, ...(p ? { stale: p.title } : {}) }
}
console.log(JSON.stringify(todo, null, 1))
console.error(`${Object.keys(todo).length} of ${new Set(shown).size} shown items need plain words`)
