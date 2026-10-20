import config from '../../trailmap.config.yaml'
import snapshot from '../data/snapshot.json'
import plainWords from '../../content/plain-words.json'

export type Item = {
  key: string
  repo: string
  number: number
  kind: 'issue' | 'pr'
  state: 'open' | 'closed' | 'merged'
  draft?: boolean
  title: string
  url: string
  labels: string[]
  author: string
  bot?: boolean
  assignees: string[]
  comments: number
  milestone?: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  stateReason?: string
  refs?: string[]
}

export type Plain = { title: string; for?: string; area?: AreaId }
export type AreaId = 'feature' | 'fix' | 'data' | 'devices' | 'backstage'

export const areas: Record<AreaId, { name: string; blurb: string; color: string }> = {
  feature: { name: 'New things you can do', blurb: 'Features and improvements you can see', color: 'var(--a-feature)' },
  fix: { name: 'Fixing what broke', blurb: 'Bugs reported by users or found by us', color: 'var(--a-fix)' },
  data: { name: 'Keeping your data safe', blurb: 'Sync, history, and never losing an edit', color: 'var(--a-data)' },
  devices: { name: 'More devices', blurb: 'iPhone, iPad, Mac, Android, installers, updates', color: 'var(--a-devices)' },
  backstage: { name: 'Behind the scenes', blurb: 'Tests, tooling, and cleanup that keep us fast', color: 'var(--a-backstage)' },
}

export const site = config.site as { title: string; team: string; summitBlurb: string }
export const generatedAt = new Date(snapshot.generatedAt)
export const windowStart = new Date(snapshot.since)
export const items = snapshot.items as unknown as Record<string, Item>
const plain = plainWords as Record<string, Plain>

export const repoLabel = (repo: string) =>
  (config.repos as { key: string; label: string }[]).find((r) => r.key === repo)?.label ?? repo

export const plainTitle = (item: Item) => plain[item.key]?.title ?? item.title
export const isBehindScenes = (item: Item) => areaOf(item) === 'backstage'
export const hasPlain = (item: Item) => Boolean(plain[item.key])
export const isDone = (item: Item) => item.state !== 'open'
export const dropped = (item: Item) => item.state === 'closed' && item.stateReason === 'not_planned'
export const daysBetween = (a: string | Date, b: string | Date) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400_000)
export const ageDays = (item: Item) => daysBetween(item.createdAt, item.closedAt ?? generatedAt)

const isBackstage = (item: Item) => {
  const t = item.title.toLowerCase()
  return (
    item.labels.some((l) => /testing|code debt|engineering|dx|dependencies|k8s/i.test(l)) ||
    /\b(ci|tests?|refactor|split .* api|bump|dependabot|workflow|runner|agent|steering|lint|vitest|skaffold|analyzer)\b/.test(t)
  )
}

export function areaOf(item: Item): AreaId {
  const fromPlain = plain[item.key]?.area
  if (fromPlain) return fromPlain
  const t = item.title.toLowerCase()
  if (item.repo === 'harmony') return isBackstage(item) ? 'backstage' : 'data'
  if (item.labels.includes('Data bug') || /\bsync|commit|snapshot|lost|crdt|harmony\b/.test(t)) return 'data'
  if (isBackstage(item)) return 'backstage'
  if (/\b(ios|ipad|iphone|mac|macos|catalyst|android|windows|linux|installer|dmg|update|play store|velopack)\b/.test(t))
    return 'devices'
  if (item.labels.includes('bug') || /^(fix|don't|stop|keep|handle)\b|\bbug|crash|error|broken|fails?\b/.test(t))
    return 'fix'
  return 'feature'
}

const get = (ref: string) => {
  const item = items[ref]
  if (!item) throw new Error(`${ref} is in the config but missing from the snapshot; run npm run sync`)
  return item
}

export type Camp = {
  id: string
  name: string
  icon: string
  blurb: string
  items: Item[]
  done: number
  total: number
  pct: number
}

function toCamp(c: { id: string; name: string; icon: string; blurb: string }, list: Item[]): Camp {
  const counted = list.filter((i) => !dropped(i))
  const done = counted.filter(isDone).length
  return { ...c, items: list, done, total: counted.length, pct: counted.length ? done / counted.length : 0 }
}

export const hasOpenPr = (item: Item) =>
  Object.values(items).some((pr) => pr.kind === 'pr' && pr.state === 'open' && !pr.draft && pr.refs?.includes(item.key))

const summitItems = (snapshot.summit.items as string[]).map(get)
const campConfigs = (config.camps ?? []) as { id: string; name: string; icon: string; blurb: string; issues: string[] }[]
const placed = new Set(campConfigs.flatMap((c) => c.issues))
const unsorted = summitItems.filter((i) => !placed.has(i.key))

export const camps: Camp[] = [
  ...campConfigs.map((c) => toCamp(c, c.issues.map(get))),
  ...(unsorted.length
    ? [
        toCamp(
          { id: 'unsorted', name: 'Still to sort', icon: '🧺', blurb: 'In the 1.0 plan, not yet given a camp.' },
          unsorted,
        ),
      ]
    : []),
]

export const summit = (() => {
  const counted = summitItems.filter((i) => !dropped(i))
  const done = counted.filter(isDone).length
  const working = counted.filter((i) => !isDone(i) && hasOpenPr(i)).length
  return {
    url: snapshot.summit.url,
    name: snapshot.summit.milestone,
    start: config.summit.start as string,
    done,
    working,
    total: counted.length,
    pct: done / counted.length,
  }
})()

export const campOf = (key: string) => camps.find((c) => c.items.some((i) => i.key === key))

export const river: Camp[] = ((config.river ?? []) as typeof campConfigs).map((c) => toCamp(c, c.issues.map(get)))

const fmt = (d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
export const fmtDate = fmt
// The `Data bug` label is how the team marks bugs that can lose or hide someone's work.
export const isDataRisk = (i: Item) => i.state === 'open' && i.labels.includes('Data bug')

const inWindow = (d?: string) => Boolean(d && new Date(d) >= windowStart)
const human = (i: Item) => !i.bot

export const shipped = Object.values(items)
  .filter((i) => i.kind === 'pr' && i.state === 'merged' && human(i) && inWindow(i.closedAt))
  .sort((a, b) => b.closedAt!.localeCompare(a.closedAt!))

export const closedIssues = Object.values(items)
  .filter((i) => i.kind === 'issue' && i.state === 'closed' && !dropped(i) && inWindow(i.closedAt))
  .sort((a, b) => b.closedAt!.localeCompare(a.closedAt!))

export const inFlight = Object.values(items)
  .filter((i) => i.kind === 'pr' && i.state === 'open' && human(i))
  .sort((a, b) => Number(Boolean(a.draft)) - Number(Boolean(b.draft)) || b.createdAt.localeCompare(a.createdAt))

// Same non-draft PRs that "Being worked on" calls ready, minus those for 1.0 issues, so the banner and that section agree.
const summitKeys = new Set(summitItems.map((i) => i.key))
export const otherWork = inFlight.filter((p) => !p.draft && !p.refs?.some((r) => summitKeys.has(r)))

export const releases = (snapshot.releases as { repo: string; tag: string; name: string; date: string; url: string }[]).filter(
  (r) => inWindow(r.date),
)

export type ForumTopic = (typeof snapshot.forum)[number]
export type Voice = ForumTopic & {
  linked: Item[]
  status: 'shipped' | 'trail' | 'considering' | 'heard'
  camp?: Camp
  heat: number
}

export const voiceStatus: Record<Voice['status'], { label: string; color: string }> = {
  shipped: { label: 'Shipped', color: 'var(--c-sage)' },
  trail: { label: 'On the road to 1.0', color: 'var(--c-sun)' },
  considering: { label: 'Tracked, after 1.0', color: 'var(--c-river)' },
  heard: { label: 'Heard, not scheduled yet', color: 'var(--ink-soft)' },
}

export const voices: Voice[] = snapshot.forum
  .map((t) => {
    const linked = t.refs.map(get)
    const camp = linked.map((i) => campOf(i.key)).find(Boolean)
    const status: Voice['status'] =
      t.tags.includes('done') || (linked.length && linked.every(isDone))
        ? 'shipped'
        : camp
          ? 'trail'
          : linked.length
            ? 'considering'
            : 'heard'
    return { ...t, linked, camp, status, heat: t.votes * 3 + t.likes + t.replies }
  })
  .sort((a, b) => b.votes - a.votes || b.heat - a.heat || b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title))

export const weekOf = (d: string | Date) => {
  const date = new Date(d)
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - ((date.getUTCDay() + 6) % 7)))
  return monday.toISOString().slice(0, 10)
}

export const people = [...new Set(shipped.map((i) => i.author))]
