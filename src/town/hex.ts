import * as THREE from 'three'
import layoutJson from './layout.json'
import packUrl from './models/hex.glb?url'
import type { Town, TownNode } from './types'
import {
  Batch,
  Library,
  brokenWindow,
  crane,
  dashedBox,
  fire,
  ghostMaterial,
  loadPack,
  recolorAtlas,
  ribbon,
  sign,
  siteFence,
  worker,
  type Cells,
  type World,
} from './world'

type Cell = [number, number]

/**
 * Cells are axial hex coordinates [q, r]. `rot` is the compass direction the building's front faces, in the
 * hex direction degrees below (0 = east, 270 = toward the camera). Each district's `lots` are its building
 * plots in order of preference; nodes without an entry in `nodes` take the next free one.
 */
export interface Layout {
  radius: number
  river: Cell[]
  bridge: number
  roads: Cell[][]
  districts: Record<string, { lots: Cell[] }>
  nodes: Record<string, { cell: Cell; rot: number; model: string }>
}

export type Placed = { node: TownNode; cell: Cell; rot: number; model: string }

const layout = layoutJson as unknown as Layout
const SQ3 = Math.sqrt(3)
const key = (q: number, r: number) => `${q},${r}`
const pos = (q: number, r: number) => [2 * q + r, r * SQ3] as const
const dist = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2
const hexDist = (a: Cell, b: Cell) => dist(a[0] - b[0], a[1] - b[1])
const DIRS: Record<number, Cell> = { 0: [1, 0], 60: [1, -1], 120: [0, -1], 180: [-1, 0], 240: [-1, 1], 300: [0, 1] }
const near = ([q, r]: Cell) => Object.values(DIRS).map(([dq, dr]) => [q + dq, r + dr] as Cell)
const dirTo = (a: Cell, b: Cell) => {
  for (const [d, [dq, dr]] of Object.entries(DIRS)) if (a[0] + dq === b[0] && a[1] + dr === b[1]) return Number(d)
  throw new Error(`not adjacent ${a} ${b}`)
}
const rad = (deg: number) => (deg * Math.PI) / 180
const facing = (deg: number) => rad(deg - 270)
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const ragged = (q: number, r: number, R: number) => {
  const d = dist(q, r)
  return d <= R - 1 || (d === R && Math.abs(q * 7 + r * 13) % 5 > 1)
}

export const MODELS = [
  'building_home_A',
  'building_home_B',
  'building_market',
  'building_tavern',
  'building_lumbermill',
  'building_windmill',
  'building_blacksmith',
  'building_mine',
  'building_watermill',
  'building_well',
  'tent',
]
const SCALE: Record<string, number> = {
  building_blacksmith: 1.15,
  building_market: 1.05,
  building_tavern: 1.1,
  building_home_A: 1.1,
  building_home_B: 1.05,
  building_mine: 1.05,
  building_watermill: 1.15,
  building_lumbermill: 0.95,
  building_well: 1.2,
  tent: 1.15,
}
const UNSORTED = 'unsorted'

/**
 * Where every node goes. Nodes in layout.json keep their cell; the rest fill free lots of their district in
 * data order, then the nearest free grass. Layout cells stay reserved even when their node is gone, so a new
 * node never moves an old one.
 */
export function placeAll(town: Town, L: Layout = layout): Placed[] {
  const order = [...town.districts.flatMap((d) => d.nodes), ...Object.keys(town.nodes).sort()]
  const ids = [...new Set(order)].filter((id) => town.nodes[id])
  const taken = new Set(Object.values(L.nodes).map((n) => key(...n.cell)))
  const blocked = new Set([...L.river, ...L.roads.flat()].map((c) => key(...c)))
  const out: Placed[] = []
  for (const id of ids) {
    const fixed = L.nodes[id]
    if (fixed) out.push({ node: town.nodes[id], cell: fixed.cell, rot: fixed.rot, model: fixed.model })
  }
  const occupied = () => [...taken].map((k) => k.split(',').map(Number) as Cell)
  for (const id of ids) {
    if (L.nodes[id]) continue
    const node = town.nodes[id]
    const lots = L.districts[node.district]?.lots ?? L.districts[UNSORTED]?.lots ?? []
    let cell = lots.find((c) => !taken.has(key(...c)))
    if (!cell) {
      const centre = lots.length ? lots[0] : ([0, 0] as Cell)
      const R = L.radius + 1
      const free: Cell[] = []
      for (let q = -R; q <= R; q++)
        for (let r = -R; r <= R; r++) if (dist(q, r) <= L.radius - 1 && !blocked.has(key(q, r)) && !taken.has(key(q, r))) free.push([q, r])
      free.sort((a, b) => hexDist(a, centre) - hexDist(b, centre) || a[0] - b[0] || a[1] - b[1])
      const used = occupied()
      cell = free.find((c) => used.every((u) => hexDist(u, c) >= 2)) ?? free[0] ?? centre
    }
    taken.add(key(...cell))
    const model = node.district === UNSORTED || !L.districts[node.district] ? 'tent' : MODELS[hash(id) % 7]
    out.push({ node, cell, rot: 270, model })
  }
  for (const p of out) if (p.node.model && MODELS.includes(p.node.model)) p.model = p.node.model
  return out
}

const RIVER: Record<string, number[]> = { hex_river_A: [0, 180], hex_river_B: [60, 180], hex_river_C: [120, 180] }
const ROAD: Record<string, number[]> = {
  hex_road_A: [0, 180],
  hex_road_B: [60, 180],
  hex_road_C: [120, 180],
  hex_road_D: [60, 180, 300],
  hex_road_E: [0, 60, 180],
  hex_road_F: [0, 180, 300],
  hex_road_G: [120, 180, 240],
  hex_road_H: [0, 120, 180, 240],
  hex_road_I: [60, 120, 240, 300],
  hex_road_J: [0, 180, 240, 300],
  hex_road_K: [60, 120, 180, 240, 300],
  hex_road_L: [0, 60, 120, 180, 240, 300],
  hex_road_M: [180],
}
function match(set: number[], table: Record<string, number[]>) {
  const want = [...set].sort((a, b) => a - b).join()
  for (const [name, open] of Object.entries(table))
    for (let k = 0; k < 6; k++)
      if (open.map((o) => (o + k * 60) % 360).sort((a, b) => a - b).join() === want) return { name, rot: rad(k * 60) }
  throw new Error(`no tile for ${want}`)
}

const top: Cells = {
  '0,2': ['#b5cf8e', '#6f9a5e'],
  '1,2': ['#5f9e6c', '#1f5a4a'],
  '4,1': ['#8fbf6a', '#3e7a4f'],
  '1,1': ['#8ccbe3', '#2b8bb5'],
  '0,1': ['#bfe3ef', '#6fb3d3'],
  '3,2': ['#f1e2bf', '#dcc296'],
  '4,2': ['#f1e2bf', '#dcc296'],
  '0,3': ['#5b7d96', '#2f4a63'],
  '2,2': ['#c9c6bd', '#8e8b84'],
  '6,1': ['#b9b2a6', '#7b726a'],
  '2,1': ['#b57f57', '#7a4b33'],
  '7,1': ['#8c6a52', '#4f3c33'],
}
const roofs: Record<string, [string, string]> = {
  editing: ['#5b7d96', '#2f4a63'],
  collaboration: ['#5fa39a', '#2c6a62'],
  'project-setup': ['#a184b8', '#5d4373'],
  platforms: ['#d9a84a', '#99681f'],
  sync: ['#4f86c6', '#24507f'],
  help: ['#8aa86c', '#4d6b3a'],
  unsorted: ['#a29d92', '#66625a'],
  old: ['#d9744e', '#9c4029'],
}
const spareRoofs = Object.values(roofs).slice(0, 6)
const earth: Cells = { '0,2': ['#a0805c', '#6c5240'] }
const rock: Cells = { '0,2': ['#8a8476', '#5a5550'] }

type Kind = 'grass' | 'river' | 'road'

export async function buildHex(town: Town): Promise<World> {
  const scene = await loadPack(packUrl)
  const lib = new Library(scene)
  let src: THREE.Texture | undefined
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh && !src) src = (o.material as THREE.MeshStandardMaterial).map ?? undefined
  })
  const mk = (cells: Cells) => new THREE.MeshLambertMaterial({ map: recolorAtlas(src!, cells), vertexColors: true })
  const mTop = mk(top)
  const mEarth = mk({ ...top, ...earth })
  const mRock = mk({ ...top, ...rock })
  const roofMats = new Map<string, THREE.MeshLambertMaterial>()
  const roofOf = (district: string) => {
    let m = roofMats.get(district)
    if (!m) {
      m = mk({ ...top, '0,3': roofs[district] ?? spareRoofs[hash(district) % spareRoofs.length] })
      roofMats.set(district, m)
    }
    return m
  }
  const batch = new Batch(lib, mTop)
  const root = new THREE.Group()
  const animated: World['animated'] = []
  const R = layout.radius
  const placed = placeAll(town)

  const cells = new Map<string, { q: number; r: number; kind: Kind; used?: boolean }>()
  const addCell = (q: number, r: number) => cells.has(key(q, r)) || cells.set(key(q, r), { q, r, kind: 'grass' })
  for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) if (ragged(q, r, R)) addCell(q, r)
  for (const p of placed) for (const c of [p.cell, ...near(p.cell)]) addCell(...c)

  const river = layout.river
  const riverOpen = new Map<string, number[]>()
  river.forEach((c, i) => {
    const prev = i > 0 ? dirTo(c, river[i - 1]) : (dirTo(c, river[1]) + 180) % 360
    const next = i < river.length - 1 ? dirTo(c, river[i + 1]) : (dirTo(c, river[i - 1]) + 180) % 360
    riverOpen.set(key(...c), [prev, next])
    cells.set(key(...c), { q: c[0], r: c[1], kind: 'river' })
  })
  const bridge = river[layout.bridge]
  const riverX = new Map(river.map(([q, r]) => [r, 2 * q + r]))
  const eastOfRiver = ([q, r]: Cell) => 2 * q + r > (riverX.get(r) ?? Infinity)

  const roadOpen = new Map<string, Set<number>>()
  const open = (c: Cell, d: number) => {
    const k = key(...c)
    if (!roadOpen.has(k)) roadOpen.set(k, new Set())
    roadOpen.get(k)!.add(d)
  }
  for (const path of layout.roads)
    for (let i = 0; i < path.length - 1; i++) {
      open(path[i], dirTo(path[i], path[i + 1]))
      open(path[i + 1], dirTo(path[i + 1], path[i]))
    }
  for (const k of roadOpen.keys()) {
    const c = cells.get(k)
    if (c && c.kind === 'grass') c.kind = 'road'
  }

  for (const c of cells.values()) {
    const [x, z] = pos(c.q, c.r)
    if (c.kind === 'river') {
      const o = riverOpen.get(key(c.q, c.r))!
      if (c.q === bridge[0] && c.r === bridge[1]) {
        const k = (o[0] % 180) / 60
        batch.model('hex_river_A', x, 0, z, rad(k * 60))
        batch.model('building_bridge_A', x, 0, z, rad(30 + k * 60))
      } else {
        const t = match(o, RIVER)
        batch.model(t.name, x, 0, z, t.rot)
      }
    } else if (c.kind === 'road') {
      const t = match([...roadOpen.get(key(c.q, c.r))!], ROAD)
      batch.model(t.name, x, 0, z, t.rot)
    } else batch.model('hex_grass', x, 0, z)
    const d = dist(c.q, c.r)
    batch.modelM('hex_grass', new THREE.Matrix4().makeTranslation(x, -1, z), mEarth)
    if (d <= R - 1 - ((c.q * 3 + c.r) % 2 === 0 ? 0 : 1)) batch.modelM('hex_grass', new THREE.Matrix4().makeTranslation(x, -2, z), mRock)
    if (d <= R - 3)
      batch.modelM('hex_grass', new THREE.Matrix4().compose(new THREE.Vector3(x, -3, z), new THREE.Quaternion(), new THREE.Vector3(0.9, 1, 0.9)), mRock)
  }

  const anchors = new Map<string, THREE.Vector3>()
  const cellOf = new Map<string, Cell>()
  const put = (name: string, x: number, z: number, rot: number, scale: number, mat?: THREE.Material) =>
    batch.modelM(
      name,
      new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(scale, scale, scale)),
      mat,
    )
  const busy = new Set(
    placed
      .filter((p) => p.node.counts.active > 0 && p.node.state !== 'planned' && p.node.district !== UNSORTED)
      .sort((a, b) => b.node.counts.active - a.node.counts.active || a.node.id.localeCompare(b.node.id))
      .slice(0, 5)
      .map((p) => p.node.id),
  )
  let cranes = 0

  for (const p of placed) {
    const { node } = p
    const c = cells.get(key(...p.cell))
    if (c) c.used = true
    cellOf.set(node.id, p.cell)
    const [cx, cz] = pos(...p.cell)
    if (c?.kind === 'river') {
      anchors.set(node.id, new THREE.Vector3(cx, 0.7, cz))
      if (node.counts.fires) animated.push(fire(root, cx, 0.35, cz, 1.2))
      continue
    }
    const rot = facing(p.rot)
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    const local = (lx: number, lz: number) => [cx + lx * cos + lz * sin, cz - lx * sin + lz * cos] as const
    const [x, z] = p.model === 'building_watermill' ? local(0, 0.25) : [cx, cz]
    const scale = (SCALE[p.model] ?? 1.1) * 1.25
    const box = lib.box(p.model)
    let h = box.max.y * scale
    const mat = eastOfRiver(p.cell) ? roofOf('old') : roofOf(node.district)
    const front = box.max.z * scale

    if (node.district === UNSORTED) {
      put('building_dirt', x, z, rot, 0.8)
      const [sx, sz] = local(-0.45, 0.75)
      sign(root, batch, 'TO SORT', sx, sz, rot - 0.2, '#fff7e6', '#1d2a3f', 0.55)
      batch.model('crate_A_big', x + 0.2, 0, z - 0.15, rot + 0.3, 1.4)
      batch.model('crate_long_A', x - 0.4, 0, z - 0.35, rot - 0.4, 1.3)
      batch.model('crate_A_big', x - 0.15, 0, z + 0.2, rot - 0.2, 1.1)
      batch.model('barrel', x + 0.6, 0, z + 0.3, 0, 1.2)
      batch.model('sack', x + 0.2, 0, z + 0.5, 1, 1.2)
      h = 0.9
    } else if (node.state === 'planned') {
      put('building_dirt', x, z, rot, 0.8)
      const ghost = new THREE.Group()
      for (const part of lib.parts(p.model)) ghost.add(new THREE.Mesh(part.geo, ghostMaterial()))
      ghost.position.set(x, 0.02, z)
      ghost.rotation.y = rot
      ghost.scale.setScalar(scale)
      root.add(ghost)
      dashedBox(root, x, 0.02, z, (box.max.x - box.min.x) * scale, h, (box.max.z - box.min.z) * scale)
      const [sx, sz] = local(0.55, 0.8)
      sign(root, batch, 'PLANNED', sx, sz, rot + 0.25, '#fff7e6', '#1d2a3f', 0.46)
    } else if (node.state === 'building') {
      const stage = ['building_stage_A', 'building_stage_B', 'building_stage_C'][hash(node.id) % 3]
      const s = 1.1 * 1.25
      put(stage, x, z, rot, s)
      h = lib.box(stage).max.y * s
      siteFence(batch, x, z, 1.55, 1.55)
      if (busy.has(node.id)) {
        const [wx, wz] = local(0.3, 0.95)
        worker(batch, wx, 0, wz)
        if (cranes < 3) {
          cranes++
          const [kx, kz] = local(-0.85, -0.6)
          crane(batch, kx, kz, 1.9, rot + rad(160))
        }
      }
    } else {
      put(p.model, x, z, rot, scale, mat)
      if (node.state === 'beta') {
        const [rx, rz] = local(0, front + 0.13)
        ribbon(batch, rx, 0.22, rz, 0.4, rot)
        const [sx, sz] = local(0.6, 0.8)
        sign(root, batch, 'BETA', sx, sz, rot + 0.2, '#7b4f9a', '#ffffff', 0.4)
      }
      if (busy.has(node.id)) {
        const [wx, wz] = local(0.75, 0.75)
        worker(batch, wx, 0, wz)
        const [lx, lz] = local(0.8, 0.15)
        batch.model('ladder', lx, 0, lz, rot - rad(90), 0.85)
      }
    }
    if (node.counts.bugs > 0 && node.state !== 'planned' && node.district !== UNSORTED) {
      const n = Math.min(node.counts.bugs, 3)
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.3 * scale
        const [bx, bz] = local(off, front + 0.01)
        brokenWindow(batch, bx, h * 0.42 + (i % 2) * 0.05, bz, rot)
      }
    }
    if (node.counts.fires > 0) {
      const size = 1.4 + 0.15 * Math.min(node.counts.fires, 4)
      animated.push(fire(root, x - 0.05, h * 0.7, z - 0.1, size))
    }
    anchors.set(node.id, new THREE.Vector3(x, h + 0.15, z))
  }

  const fillers = ['building_home_A', 'building_home_B', 'building_home_A', 'building_well']
  const oldMat = roofOf('old')
  for (const c of cells.values()) {
    if (c.used || c.kind !== 'grass' || !eastOfRiver([c.q, c.r]) || dist(c.q, c.r) > R - 2) continue
    if (near([c.q, c.r]).some((n) => cells.get(key(...n))?.kind === 'river')) continue
    const hsh = Math.abs(c.q * 92821 + c.r * 68917) % 97
    if (hsh % 3 === 0) continue
    c.used = true
    const [x, z] = pos(c.q, c.r)
    put(fillers[hsh % fillers.length], x - 0.45, z - 0.3, rad((hsh % 3) * 15 - 15), 0.85, oldMat)
    put(fillers[(hsh + 1) % 3], x + 0.5, z + 0.35, rad((hsh % 5) * 10 - 20), 0.8, oldMat)
    if (hsh % 4 === 0) batch.model(['barrel', 'crate_A_big', 'wheelbarrow', 'sack'][hsh % 4], x + 0.1, 0, z + 0.85, hsh)
  }

  for (const [i, j] of [
    [0, 1],
    [river.length - 1, river.length - 2],
  ]) {
    const [x, z] = pos(...river[i])
    const a = rad((dirTo(river[i], river[j]) + 180) % 360)
    const ex = x + Math.cos(a) * 1.0
    const ez = z - Math.sin(a) * 1.0
    batch.box(ex, -1.2, ez, 0.85, 1.05, 0.08, '#4aa3cc', a + Math.PI / 2)
    batch.box(ex + Math.cos(a) * 0.02, -2.0, ez - Math.sin(a) * 0.02, 0.8, 0.8, 0.08, '#8ccbe3', a + Math.PI / 2)
    batch.box(ex + Math.cos(a) * 0.05, -0.32, ez - Math.sin(a) * 0.05, 0.9, 0.12, 0.1, '#e9f6fb', a + Math.PI / 2)
  }

  const trees = ['trees_A_large', 'trees_B_large', 'trees_A_medium', 'trees_B_medium', 'trees_A_small']
  const lotCells = new Set(Object.values(layout.districts).flatMap((d) => d.lots.map((c) => key(...c))))
  let n = 0
  for (const c of cells.values()) {
    if (c.used || c.kind !== 'grass') continue
    const d = dist(c.q, c.r)
    const h = Math.abs(c.q * 31 + c.r * 17 + c.q * c.r * 7)
    const [x, z] = pos(c.q, c.r)
    const lot = lotCells.has(key(c.q, c.r))
    if (d >= R - 1 && h % 2 === 0) batch.model(trees[h % trees.length], x, 0, z, rad((h % 6) * 60))
    else if (lot) {
      if (h % 3 === 0) batch.model(['rock_single_A', 'rock_single_B'][h % 2], x - 0.4, 0, z + 0.3)
    } else if (h % 7 === 0) batch.model(h % 2 ? 'hills_A_trees' : 'hills_B_trees', x, 0, z, rad((h % 6) * 60))
    else if (h % 6 === 2) batch.model(trees[(h >> 2) % trees.length], x, 0, z, rad((h % 6) * 60), 0.8)
    else if (h % 4 === 0) batch.model(['tree_single_A', 'tree_single_B'][n++ % 2], x + 0.4, 0, z - 0.3)
    else if (h % 5 === 0) batch.model(['rock_single_A', 'rock_single_B', 'rock_single_C'][h % 3], x - 0.3, 0, z + 0.2)
  }
  for (const [i, c] of river.entries()) {
    if (i % 3 !== 1 || i === layout.bridge) continue
    const [x, z] = pos(...c)
    batch.model(i % 2 ? 'waterlily_A' : 'waterplant_A', x + 0.35, 0, z - 0.2, i)
  }

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const c of cells.values()) {
    const [x, z] = pos(c.q, c.r)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }
  const clouds: [number, number, number, number][] = [
    [minX + 2, -3.6, 7, 0.8],
    [maxX, -3.4, 5, 0.9],
    [-2, -5, maxZ + 2, 0.7],
  ]
  for (const [x, y, z, s] of clouds) batch.model('cloud_big', x, y, z, x * 0.3, s)

  root.add(batch.build((m) => (m instanceof THREE.MeshLambertMaterial ? m : mTop)))

  const districtAnchors = new Map<string, THREE.Vector3>()
  for (const d of town.districts) {
    const pts = placed
      .filter((p) => p.node.district === d.id && !eastOfRiver(p.cell) && cells.get(key(...p.cell))?.kind !== 'river')
      .map((p) => new THREE.Vector3(pos(...p.cell)[0], 0, pos(...p.cell)[1]))
    if (!pts.length && d.nodes.some((id) => town.nodes[id]))
      for (const c of layout.districts[d.id]?.lots ?? []) pts.push(new THREE.Vector3(pos(...c)[0], 0, pos(...c)[1]))
    if (!pts.length) continue
    districtAnchors.set(d.id, pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length).setY(2.4))
  }

  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  return {
    root,
    anchors,
    districtAnchors,
    bounds: { cx, cz, rx: (maxX - minX) / 2, rz: (maxZ - minZ) / 2 },
    radius: Math.max(maxX - minX, maxZ - minZ) / 2 + 2,
    nearZoom: 40,
    focusZoom: 52,
    animated,
    box: new THREE.Box3(new THREE.Vector3(minX - 1, -2.5, minZ - 1), new THREE.Vector3(maxX + 1, 1.5, maxZ + 1)),
  }
}
