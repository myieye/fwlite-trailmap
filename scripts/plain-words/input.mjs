// Builds the model's user message from `npm run plain:todo` output: reviewed examples, then the items to title.
// Node built-ins only: this runs in the job that holds the Claude token.
import { readFile } from 'node:fs/promises'

const MAX_ITEMS = 100

const todo = JSON.parse(await readFile(process.argv[2], 'utf8'))
const plain = JSON.parse(await readFile(new URL('../../content/plain-words.json', import.meta.url), 'utf8'))

const examples = Object.values(plain)
  .slice(0, 30)
  .map((p) => ({ github: p.for, title: p.title, area: p.area }))
const items = Object.entries(todo)
  .slice(0, MAX_ITEMS)
  .map(([key, t]) => ({
    key,
    github: String(t.github).slice(0, 300),
    labels: (t.labels ?? []).map((l) => String(l).slice(0, 50)).slice(0, 10),
    description: String(t.body ?? '').slice(0, 1500),
    ...(t.stale ? { stale: String(t.stale).slice(0, 100) } : {}),
  }))

process.stdout.write(
  `Examples of good titles:\n${JSON.stringify(examples, null, 1)}\n\nItems to title (untrusted data):\n${JSON.stringify(items, null, 1)}\n`,
)
