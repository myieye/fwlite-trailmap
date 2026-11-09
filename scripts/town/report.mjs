// Prints each building's state and counts, then everything in "Still to sort".
// `npm run town:report -- --items` also lists every open fire and bug per building.
import { snapshot, town } from './load.mjs'

const showItems = process.argv.includes('--items')
const rows = Object.values(town.nodes).map((n) => [n.id, n.state, n.counts.fires, n.counts.bugs, n.counts.open, n.counts.done, n.counts.active])
const head = ['node', 'state', 'fires', 'bugs', 'open', 'done', 'active']
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)))
const line = (r) => r.map((c, i) => (i < 2 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join('  ')
console.log(line(head))
for (const r of rows) console.log(line(r))

const open = new Set(Object.values(town.nodes).flatMap((n) => n.items.filter((i) => i.kind !== 'done').map((i) => i.key)))
const unsorted = town.nodes.unsorted.items.filter((i) => i.kind !== 'done')
console.log(`\n${open.size} open items, ${unsorted.length} in Still to sort (${Math.round((100 * unsorted.length) / open.size)}%)`)
const gh = (key) => snapshot.items[key]
for (const i of unsorted) console.log(`  ${i.kind.padEnd(4)} ${i.key.padEnd(13)} ${gh(i.key).title}`)

if (showItems)
  for (const n of Object.values(town.nodes)) {
    const hot = n.items.filter((i) => i.kind === 'fire' || i.kind === 'bug')
    if (!hot.length || n.id === 'unsorted') continue
    console.log(`\n${n.name}`)
    for (const i of hot) console.log(`  ${i.kind.padEnd(4)} ${i.key.padEnd(13)} ${gh(i.key).title}`)
  }
