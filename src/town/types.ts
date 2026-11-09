export type State = 'planned' | 'building' | 'beta' | 'open'

export type ItemKind = 'fire' | 'bug' | 'work' | 'done'

export interface TownItem {
  key: string
  title: string
  url: string
  kind: ItemKind
  isPr: boolean
  active: boolean
}

export interface TownNode {
  id: string
  name: string
  blurb: string
  district: string
  state: State
  since?: string
  evidence?: string
  model?: string
  counts: { fires: number; bugs: number; open: number; done: number; active: number }
  items: TownItem[]
}

export interface TownDistrict {
  id: string
  name: string
  blurb: string
  nodes: string[]
}

export interface Town {
  generatedAt: string
  doneSince: string
  districts: TownDistrict[]
  nodes: Record<string, TownNode>
  edges: [string, string][]
}
