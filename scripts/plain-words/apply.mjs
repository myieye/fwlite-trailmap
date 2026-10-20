// Checks the model's titles and merges them into content/plain-words.json. Exits non-zero on anything unexpected.
// The model reads text anyone can write on GitHub, so its output is treated as hostile: only known keys, a strict
// character set and a fixed area list get through, and `for` comes from the todo list, never from the model.
// A title that breaks the rules is skipped (it stays on the todo list); a malformed draft fails the run.
// Node built-ins only: this runs in the job that can push to main.
import { readFile, writeFile } from 'node:fs/promises'

const KEY = /^(lexbox|harmony)#\d{1,6}$/
const TITLE = /^[\p{L}\p{N} .,:;'"?!()/&+%#-]{3,70}$/u
const LINKISH = /:\/\/|www|\p{L}\.\p{L}/iu
const AREAS = new Set(['feature', 'fix', 'data', 'devices', 'backstage'])
const MAX_ITEMS = 100

const fail = (msg) => {
  console.error(`plain-words: ${msg}`)
  process.exit(1)
}

const [todoPath, draftPath] = process.argv.slice(2)
const todo = JSON.parse(await readFile(todoPath, 'utf8'))
const draft = JSON.parse(await readFile(draftPath, 'utf8'))
const plainUrl = new URL('../../content/plain-words.json', import.meta.url)
const plain = JSON.parse(await readFile(plainUrl, 'utf8'))

if (!Array.isArray(draft?.items) || draft.items.length > MAX_ITEMS) fail('draft is not a list of at most 100 items')
const seen = new Set()
for (const item of draft.items) {
  if (typeof item !== 'object' || item === null) fail('item is not an object')
  const extra = Object.keys(item).filter((k) => !['key', 'title', 'area'].includes(k))
  if (extra.length) fail(`unexpected fields ${extra.join(', ')}`)
  const { key, title, area } = item
  if (typeof key !== 'string' || !KEY.test(key) || !Object.hasOwn(todo, key)) fail(`key not in todo list: ${JSON.stringify(key)}`)
  if (seen.has(key)) fail(`duplicate key ${key}`)
  seen.add(key)
  if (typeof title !== 'string' || !AREAS.has(area)) fail(`${key}: malformed title or area`)
  if (!TITLE.test(title) || LINKISH.test(title)) {
    console.error(`plain-words: skipped ${key}, title breaks the rules: ${JSON.stringify(title)}`)
    continue
  }
  const github = todo[key].github
  if (typeof github !== 'string' || github.length > 300 || /\p{Cc}/u.test(github)) fail(`${key}: odd GitHub title`)
  plain[key] = { title, for: github, area }
}

await writeFile(plainUrl, JSON.stringify(plain, null, 1) + '\n')
console.error(`plain-words: checked ${seen.size} titles`)
