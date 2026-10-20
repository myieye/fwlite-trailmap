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

const todo = {}
for (const i of shown) {
  const p = plain[i.key]
  if (!p || p.for !== i.title) todo[i.key] = { github: i.title, url: i.url, labels: i.labels, ...(p ? { stale: p.title } : {}) }
}
console.log(JSON.stringify(todo, null, 1))
console.error(`${Object.keys(todo).length} of ${shown.length} shown items need plain words`)
