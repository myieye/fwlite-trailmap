import type { State, Town, TownItem, TownNode } from './types'

export const stateInfo: Record<State, { label: string; meaning: string }> = {
  planned: { label: 'Planned', meaning: 'On the plan. Nobody is building it yet.' },
  building: { label: 'Being built', meaning: 'The team is building it now. Not ready to use yet.' },
  beta: { label: 'Beta', meaning: 'Usable, but not ready for everyone yet.' },
  open: { label: 'Released', meaning: 'Released and ready for everyone.' },
}

export const states: State[] = ['planned', 'building', 'beta', 'open']

export const groups: { id: string; title: string; pick: (i: TownItem) => boolean }[] = [
  { id: 'fire', title: 'Urgent fixes needed', pick: (i) => i.kind === 'fire' },
  { id: 'bug', title: 'Bug fixes needed', pick: (i) => i.kind === 'bug' },
  { id: 'work', title: 'Being worked on', pick: (i) => i.kind === 'work' && i.active },
  { id: 'todo', title: 'To do', pick: (i) => i.kind === 'work' && !i.active },
  { id: 'done', title: 'Recently done', pick: (i) => i.kind === 'done' },
]

const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
/** A `since` of "2026-09" stays a month: the config never claimed a day. */
export const date = (iso: string) => (/^\d{4}-\d{2}$/.test(iso) ? monthFmt : fmt).format(new Date(iso))

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function summary(nodes: TownNode[]) {
  const by = (s: State) => nodes.filter((n) => n.state === s).length
  const fires = nodes.filter((n) => n.counts.fires > 0).length
  return `${plural(nodes.length, 'feature')}: ${by('open')} released, ${by('beta')} in beta, ${by('building')} being built, ${by('planned')} planned. ${plural(fires, 'feature has', 'features have')} data-loss or urgent bugs.`
}

/** Totals for the key. An item on two buildings counts once. */
export function totals(nodes: TownNode[]) {
  const items = new Map(nodes.flatMap((n) => n.items).map((i) => [i.key, i]))
  const open = [...items.values()].filter((i) => i.kind !== 'done')
  return {
    states: Object.fromEntries(states.map((s) => [s, nodes.filter((n) => n.district !== 'unsorted' && n.state === s).length])) as Record<State, number>,
    fires: open.filter((i) => i.kind === 'fire').length,
    bugs: open.filter((i) => i.kind === 'bug').length,
    active: open.filter((i) => i.active).length,
    open: open.length,
  }
}

/** "Still to sort" only shows while something is waiting to be sorted. */
export function visible(t: Town): Town {
  const keep = (n: TownNode) => !(n.district === 'unsorted' && n.counts.open === 0)
  const nodes = Object.fromEntries(Object.entries(t.nodes).filter(([, n]) => keep(n)))
  return { ...t, nodes, districts: t.districts.map((d) => ({ ...d, nodes: d.nodes.filter((id) => nodes[id]) })) }
}
