// Checks history files from the sync job and copies them into history/. The sync job runs npm packages, so its
// output is checked here before it reaches main: strict names, shapes and sizes, and no field the format lacks.
// Node built-ins only: this runs in the job that can push to main. Usage: node history-check.mjs <dir>
import { copyFile, readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const NAME = /^\d{4}-\d{2}-\d{2}\.json$/
const KEY = /^(lexbox|harmony)#\d{1,6}$/
const ID = /^[a-z][a-z-]{0,39}$/
const STATES = new Set(['planned', 'building', 'beta', 'open'])
const ITEM_STATES = new Set(['open', 'closed', 'merged'])
const KINDS = new Set(['fire', 'bug', 'work', 'done'])
const COUNTS = ['fires', 'bugs', 'open', 'done', 'active']
const MAX_BYTES = 200_000

const fail = (msg) => {
  console.error(`history-check: ${msg}`)
  process.exit(1)
}
const isObj = (o) => typeof o === 'object' && o !== null && !Array.isArray(o)
const exactKeys = (o, keys, what) => {
  if (!isObj(o) || Object.keys(o).join() !== keys.join()) fail(`${what}: unexpected fields`)
}
const text = (s) => typeof s === 'string' && s.length <= 60 && !/\p{Cc}/u.test(s)

const dir = process.argv[2]
const files = await readdir(dir).catch(() => [])
for (const f of files) {
  if (!NAME.test(f)) fail(`unexpected file ${JSON.stringify(f)}`)
  const path = resolve(dir, f)
  if ((await stat(path)).size > MAX_BYTES) fail(`${f} is too big`)
  const r = JSON.parse(await readFile(path, 'utf8'))
  exactKeys(r, ['date', 'generatedAt', 'nodes', 'items'], f)
  if (`${r.date}.json` !== f || Number.isNaN(Date.parse(r.generatedAt))) fail(`${f}: bad date`)
  if (!isObj(r.nodes) || !isObj(r.items)) fail(`${f}: bad shape`)
  for (const [id, n] of Object.entries(r.nodes)) {
    exactKeys(n, ['state', ...COUNTS], `${f} node ${id}`)
    if (!ID.test(id) || !STATES.has(n.state) || !COUNTS.every((c) => Number.isInteger(n[c]) && n[c] >= 0))
      fail(`${f}: bad node ${JSON.stringify(id)}`)
  }
  for (const [key, i] of Object.entries(r.items)) {
    exactKeys(i, ['state', 'kind', 'labels', 'nodes'], `${f} item ${key}`)
    if (!KEY.test(key) || !ITEM_STATES.has(i.state) || !KINDS.has(i.kind)) fail(`${f}: bad item ${JSON.stringify(key)}`)
    if (!Array.isArray(i.labels) || i.labels.length > 20 || !i.labels.every(text)) fail(`${f} ${key}: bad labels`)
    if (!Array.isArray(i.nodes) || !i.nodes.every((id) => Object.hasOwn(r.nodes, id))) fail(`${f} ${key}: bad nodes`)
  }
  await copyFile(path, new URL(`../../history/${f}`, import.meta.url))
  console.error(`history-check: ${f} ok`)
}
