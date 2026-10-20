// Adds a trimmed issue/PR description to each todo item, so the model has more than the title to go on.
// Usage: node context.mjs todo.json (rewrites the file in place).
import { readFile, writeFile } from 'node:fs/promises'

const REPOS = { lexbox: 'sillsdev/languageforge-lexbox', harmony: 'sillsdev/harmony' }
const MAX_ITEMS = 100
const headers = { accept: 'application/vnd.github+json', 'user-agent': 'trailmap' }
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`

const clean = (body) =>
  (body ?? '')
    .replace(/<!--[\s\S]*?-->|```[\s\S]*?```/g, '')
    .replace(/<\/?(details|summary)[^>]*>|!\[[^\]]*\]\([^)]*\)|<img[^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500)

const path = process.argv[2]
const todo = JSON.parse(await readFile(path, 'utf8'))
for (const key of Object.keys(todo).slice(0, MAX_ITEMS)) {
  const [repo, number] = key.split('#')
  if (!REPOS[repo] || !/^\d+$/.test(number)) continue
  const res = await fetch(`https://api.github.com/repos/${REPOS[repo]}/issues/${number}`, { headers })
  if (res.ok) todo[key].body = clean((await res.json()).body)
  else console.error(`context: ${key} ${res.status}`)
}
await writeFile(path, JSON.stringify(todo, null, 1))
