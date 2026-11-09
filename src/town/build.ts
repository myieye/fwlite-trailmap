// Builds the town from the synced snapshot, town.config.yaml and plain words. No imports with side effects: the page
// (via model.ts), scripts/sync.mjs and the town scripts all run this, the scripts through Node's type stripping.
import type { ItemKind, State, Town, TownItem, TownNode } from './types'

export type SnapItem = {
  key: string
  repo: string
  kind: 'issue' | 'pr'
  state: 'open' | 'closed' | 'merged'
  draft?: boolean
  title: string
  url: string
  labels: string[]
  bot?: boolean
  assignees: string[]
  createdAt: string
  closedAt?: string
  stateReason?: string
  refs?: string[]
}

export type Snapshot = {
  generatedAt: string
  since: string
  items: Record<string, SnapItem>
  town?: { epics: Record<string, string[]> }
}

type Rules = { issues?: string[]; epics?: string[]; labels?: string[]; titles?: string[]; repos?: string[] }
type NodeConfig = Rules & { id: string; name: string; blurb: string; state: State; since?: string; evidence?: string; model?: string }
export type TownConfig = {
  include: { repos?: string[]; labels?: string[] }
  skip?: { issues?: string[]; labels?: string[]; titles?: string[] }
  districts: { id: string; name: string; blurb: string; nodes: NodeConfig[] }[]
  unsorted: { name: string; blurb: string; district: { id: string; name: string; blurb: string } }
  edges: [string, string][]
}

export const UNSORTED = 'unsorted'
const FIRE_LABELS = ['Data bug', 'High Priority']

export const townNodes = (config: TownConfig) => config.districts.flatMap((d) => d.nodes.map((n) => ({ ...n, district: d.id })))
export const epicRefs = (config: TownConfig) => [...new Set(townNodes(config).flatMap((n) => n.epics ?? []))]
export const pinnedRefs = (config: TownConfig) => [...new Set(townNodes(config).flatMap((n) => n.issues ?? []))]

// Pins beat repos, then a PR goes where the issues it closes go, then epics, labels and title patterns.
// Within a tier an item lands on every node that matches.
export function attacher(config: TownConfig, epics: Record<string, string[]>, items: Record<string, SnapItem>) {
  const nodes = townNodes(config)
  const index = (pick: (n: NodeConfig) => string[] | undefined) => {
    const map = new Map<string, string[]>()
    for (const n of nodes) for (const k of pick(n) ?? []) map.set(k, [...(map.get(k) ?? []), n.id])
    return map
  }
  const pins = index((n) => n.issues)
  const repos = index((n) => n.repos)
  const labels = index((n) => n.labels)
  const bySub = index((n) => (n.epics ?? []).flatMap((e) => [e, ...(epics[e] ?? [])]))
  const titles = nodes.flatMap((n) => (n.titles ?? []).map((t) => ({ id: n.id, re: new RegExp(t, 'i') })))
  const uniq = (ids: string[]) => [...new Set(ids)]

  const byRules = (item: SnapItem): string[] => {
    for (const ids of [
      bySub.get(item.key) ?? [],
      item.labels.flatMap((l) => labels.get(l) ?? []),
      titles.filter((t) => t.re.test(item.title)).map((t) => t.id),
    ])
      if (ids.length) return uniq(ids)
    return []
  }
  const attach = (item: SnapItem): string[] => {
    const pinned = pins.get(item.key)
    if (pinned) return uniq(pinned)
    const repo = repos.get(item.repo)
    if (repo) return repo
    if (item.kind === 'pr') {
      const viaRefs = (item.refs ?? []).flatMap((r) => (items[r]?.kind === 'issue' ? attach(items[r]) : []))
      if (viaRefs.length) return uniq(viaRefs)
    }
    return byRules(item)
  }
  return attach
}

// Which items the town shows at all. Lexbox has plenty of admin-only issues that no building owns.
export function townFilter(config: TownConfig, attach: (i: SnapItem) => string[]) {
  const allRepos = new Set(config.include.repos ?? [])
  const product = new Set(config.include.labels ?? [])
  const pinned = new Set(pinnedRefs(config))
  const skipIssues = new Set(config.skip?.issues ?? [])
  const skipLabels = new Set(config.skip?.labels ?? [])
  const skipTitles = (config.skip?.titles ?? []).map((t) => new RegExp(t, 'i'))
  const skipped = (i: SnapItem) =>
    skipIssues.has(i.key) ||
    (!pinned.has(i.key) && (i.labels.some((l) => skipLabels.has(l)) || skipTitles.some((re) => re.test(i.title))))
  const relevant = (i: SnapItem) =>
    !i.bot && (allRepos.has(i.repo) || i.labels.some((l) => product.has(l)) || attach(i).length > 0)
  return { relevant, skipped }
}

const ORDER: Record<ItemKind, number> = { fire: 0, bug: 1, work: 2, done: 3 }

export function buildTown(snapshot: Snapshot, config: TownConfig, plain: Record<string, { title: string }>): Town {
  const { items, since } = snapshot
  const epics = snapshot.town?.epics ?? {}
  for (const ref of pinnedRefs(config))
    if (!items[ref]) throw new Error(`${ref} is pinned in town.config.yaml but missing from the snapshot; run npm run sync`)
  for (const ref of epicRefs(config))
    if (!epics[ref]) throw new Error(`Epic ${ref} in town.config.yaml has no sub-issues in the snapshot; run npm run sync`)

  const attach = attacher(config, epics, items)
  const { relevant, skipped } = townFilter(config, attach)

  const openPrRefs = new Set(
    Object.values(items)
      .filter((i) => i.kind === 'pr' && i.state === 'open')
      .flatMap((i) => i.refs ?? []),
  )
  const kindOf = (i: SnapItem): ItemKind | undefined => {
    if (i.state === 'open') {
      if (i.kind === 'pr') return 'work'
      if (i.labels.some((l) => FIRE_LABELS.includes(l))) return 'fire'
      return i.labels.includes('bug') ? 'bug' : 'work'
    }
    const finished = i.kind === 'pr' ? i.state === 'merged' : i.stateReason !== 'not_planned'
    if (finished && i.closedAt && i.closedAt >= since) return 'done'
  }

  const nodes: Record<string, TownNode> = {}
  const add = (id: string, district: string, n: { name: string; blurb: string; state: State; since?: string; evidence?: string; model?: string }) =>
    (nodes[id] = {
      id,
      name: n.name,
      blurb: n.blurb,
      district,
      state: n.state,
      ...(n.since ? { since: String(n.since) } : {}),
      ...(n.evidence ? { evidence: n.evidence } : {}),
      ...(n.model ? { model: n.model } : {}),
      counts: { fires: 0, bugs: 0, open: 0, done: 0, active: 0 },
      items: [],
    })
  for (const n of townNodes(config)) add(n.id, n.district, n)
  const u = config.unsorted
  add(UNSORTED, u.district.id, { name: u.name, blurb: u.blurb, state: 'building' })

  const sortKey = new Map<string, string>()
  for (const i of Object.values(items)) {
    const kind = kindOf(i)
    if (!kind || !relevant(i) || skipped(i)) continue
    const item: TownItem = {
      key: i.key,
      title: plain[i.key]?.title ?? i.title,
      url: i.url,
      kind,
      isPr: i.kind === 'pr',
      active: kind !== 'done' && (i.kind === 'pr' || i.assignees.length > 0 || openPrRefs.has(i.key)),
    }
    sortKey.set(i.key, kind === 'done' ? i.closedAt! : i.createdAt)
    const ids = attach(i)
    for (const id of ids.length ? ids : [UNSORTED]) {
      const node = nodes[id]
      node.items.push(item)
      const c = node.counts
      if (kind === 'fire') c.fires++
      if (kind === 'bug') c.bugs++
      if (kind === 'done') c.done++
      else c.open++
      if (item.active) c.active++
    }
  }
  for (const n of Object.values(nodes))
    n.items.sort(
      (a, b) =>
        ORDER[a.kind] - ORDER[b.kind] || Number(b.active) - Number(a.active) || sortKey.get(b.key)!.localeCompare(sortKey.get(a.key)!),
    )

  for (const [a, b] of config.edges) if (!nodes[a] || !nodes[b]) throw new Error(`Edge ${a} - ${b} names an unknown node`)
  return {
    generatedAt: snapshot.generatedAt,
    doneSince: since,
    districts: [
      ...config.districts.map((d) => ({ id: d.id, name: d.name, blurb: d.blurb, nodes: d.nodes.map((n) => n.id) })),
      { ...u.district, nodes: [UNSORTED] },
    ],
    nodes,
    edges: config.edges,
  }
}
