import * as THREE from 'three'
import { buildings, type Building, type DistrictId } from './data'
import packUrl from './models/hex.glb?url'
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
  scaffold,
  sign,
  siteFence,
  worker,
  type Cells,
  type World,
} from './world'

const SQ3 = Math.sqrt(3)
const R = 6
const key = (q: number, r: number) => `${q},${r}`
const pos = (q: number, r: number) => [2 * q + r, r * SQ3] as const
const dist = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2
const DIRS: Record<number, [number, number]> = { 0: [1, 0], 60: [1, -1], 120: [0, -1], 180: [-1, 0], 240: [-1, 1], 300: [0, 1] }
const dirTo = (a: [number, number], b: [number, number]) => {
  for (const [d, [dq, dr]] of Object.entries(DIRS)) if (a[0] + dq === b[0] && a[1] + dr === b[1]) return Number(d)
  throw new Error(`not adjacent ${a} ${b}`)
}
const rad = (deg: number) => (deg * Math.PI) / 180
const facing = (deg: number) => rad(deg - 270)

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
  hex_road_J: [0, 180, 240, 300],
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
const oldRoofs: Cells = { '0,3': ['#d9744e', '#9c4029'] }
const earth: Cells = { '0,2': ['#a0805c', '#6c5240'] }
const rock: Cells = { '0,2': ['#8a8476', '#5a5550'] }

type Kind = 'grass' | 'river' | 'road'

export async function buildHex(): Promise<World> {
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
  const mOld = mk({ ...top, ...oldRoofs })
  const paint = mTop
  const batch = new Batch(lib, paint)
  const root = new THREE.Group()
  const animated: World['animated'] = []

  const cells = new Map<string, { q: number; r: number; kind: Kind; used?: boolean }>()
  const ragged = (q: number, r: number) => {
    const d = dist(q, r)
    if (d <= R - 1) return true
    if (d > R) return false
    return (Math.abs(q * 7 + r * 13) % 5) > 1
  }
  for (let q = -R - 1; q <= R + 1; q++)
    for (let r = -R - 1; r <= R + 1; r++) if (ragged(q, r)) cells.set(key(q, r), { q, r, kind: 'grass' })

  const walk = (start: [number, number], dirs: number[]) => {
    const out: [number, number][] = [start]
    for (const d of dirs) {
      const [q, r] = out[out.length - 1]
      out.push([q + DIRS[d][0], r + DIRS[d][1]])
    }
    return out
  }
  const river = walk([5, -6], [240, 300, 240, 300, 240, 240, 300, 300, 240, 300, 240, 300])
  const BRIDGE = 7
  const riverOpen = new Map<string, number[]>()
  river.forEach((c, i) => {
    const open: number[] = []
    if (i > 0) open.push(dirTo(c, river[i - 1]))
    else open.push((dirTo(c, river[1]) + 180) % 360)
    if (i < river.length - 1) open.push(dirTo(c, river[i + 1]))
    else open.push((dirTo(c, river[i - 1]) + 180) % 360)
    riverOpen.set(key(...c), open)
    cells.set(key(...c), { q: c[0], r: c[1], kind: 'river' })
  })

  const roads = [
    walk([-3, 6], [120, 120, 60, 120, 60, 120]),
    walk([-1, 1], [0, 300, 60, 60, 0, 60]),
    walk([-1, 0], [180, 180]),
  ]
  const [bq, br] = river[BRIDGE]
  const roadOpen = new Map<string, Set<number>>()
  const open = (c: [number, number], d: number) => {
    const k = key(...c)
    if (!roadOpen.has(k)) roadOpen.set(k, new Set())
    roadOpen.get(k)!.add(d)
  }
  for (const path of roads)
    for (let i = 0; i < path.length - 1; i++) {
      open(path[i], dirTo(path[i], path[i + 1]))
      open(path[i + 1], dirTo(path[i + 1], path[i]))
    }
  open(roads[0][0], 300)
  for (const k of roadOpen.keys()) {
    const c = cells.get(k)
    if (c && c.kind === 'grass') c.kind = 'road'
  }

  for (const c of cells.values()) {
    const [x, z] = pos(c.q, c.r)
    if (c.kind === 'river') {
      const open = riverOpen.get(key(c.q, c.r))!
      if (c.q === bq && c.r === br) {
        const k = (open[0] % 180) / 60
        batch.model('hex_river_A', x, 0, z, rad(k * 60))
        batch.model('building_bridge_A', x, 0, z, rad(30 + k * 60))
      } else {
        const t = match(open, RIVER)
        batch.model(t.name, x, 0, z, t.rot)
      }
    } else if (c.kind === 'road') {
      const t = match([...roadOpen.get(key(c.q, c.r))!], ROAD)
      batch.model(t.name, x, 0, z, t.rot)
    } else batch.model('hex_grass', x, 0, z)
    const d = dist(c.q, c.r)
    const m = new THREE.Matrix4().makeTranslation(x, -1, z)
    batch.modelM('hex_grass', m, mEarth)
    if (d <= R - 1 - ((c.q * 3 + c.r) % 2 === 0 ? 0 : 1)) batch.modelM('hex_grass', new THREE.Matrix4().makeTranslation(x, -2, z), mRock)
    if (d <= R - 3) batch.modelM('hex_grass', new THREE.Matrix4().compose(new THREE.Vector3(x, -3, z), new THREE.Quaternion(), new THREE.Vector3(0.9, 1, 0.9)), mRock)
  }

  const anchors = new Map<string, THREE.Vector3>()
  const features = new Set<string>()
  const at = (q: number, r: number) => {
    const c = cells.get(key(q, r))
    if (c) c.used = true
    features.add(key(q, r))
    return pos(q, r)
  }
  const withY = ([x, z]: readonly [number, number]) => [x, 0, z] as const
  const byId = Object.fromEntries(buildings.map((b) => [b.id, b])) as Record<string, Building>
  const place = (id: string, model: string, q: number, r: number, rot = 0, scale = 1, dx = 0, dz = 0) => {
    const [x0, z0] = at(q, r)
    const x = x0 + dx
    const z = z0 + dz
    const b = byId[id]
    scale *= 1.3
    const box = lib.box(model)
    const h = box.max.y * scale
    if (b.state === 'planned') {
      batch.model('building_dirt', x, 0, z, rot, 0.75)
      const ghost = new THREE.Group()
      for (const p of lib.parts(model)) ghost.add(new THREE.Mesh(p.geo, ghostMaterial()))
      ghost.position.set(x, 0.02, z)
      ghost.rotation.y = rot
      ghost.scale.setScalar(scale)
      root.add(ghost)
      dashedBox(root, x, 0.02, z, (box.max.x - box.min.x) * scale, h, (box.max.z - box.min.z) * scale)
      sign(root, batch, 'PLANNED', x + 0.55, z + 0.75, 0.25, '#fff7e6', '#1d2a3f', 0.46)
    } else batch.model(model, x, 0, z, rot, scale)
    if (b.broken) {
      const c = Math.cos(rot)
      const s = Math.sin(rot)
      for (let i = 0; i < b.broken; i++) {
        const off = (i - (b.broken - 1) / 2) * 0.3 * scale
        const fz = box.max.z * scale + 0.01
        brokenWindow(batch, x + c * off + s * fz, h * 0.42 + (i % 2) * 0.05, z - s * off + c * fz, rot)
      }
    }
    anchors.set(id, new THREE.Vector3(x, h + 0.15, z))
    return { x, z, h, box, scale }
  }

  const edit = place('entry-editor', 'building_blacksmith', -3, 1, 0, 1.35)
  crane(batch, edit.x - 0.95, edit.z - 0.5, 2.2, rad(-20))
  worker(batch, edit.x + 0.7, 0, edit.z + 0.85)
  worker(batch, edit.x + 0.9, 0, edit.z + 0.55, '#ffd23a')
  batch.model('ladder', edit.x + 0.85, 0, edit.z + 0.15, rad(-90), 0.9)
  batch.model('resource_lumber', edit.x - 0.4, 0, edit.z + 0.95, 0.4, 0.8)

  place('entry-list', 'building_market', -1, -2, 0, 1.05)
  place('history', 'building_tavern', -5, 3, rad(-20), 1.1)
  const cf = place('complex-forms', 'building_stage_B', -4, -1, 0, 1.2)
  batch.model('building_scaffolding', cf.x, 0, cf.z, 0, 0.75)
  batch.model('resource_stone', cf.x + 0.75, 0, cf.z + 0.6, 0, 0.8)
  worker(batch, cf.x - 0.5, 0, cf.z + 0.8)
  place('custom-fields', 'building_home_B', -1, -5, 0, 1)

  place('windows', 'building_home_B', -5, 6, rad(-10))
  place('android', 'building_windmill', -1, 3, 0)
  batch.model('building_grain', ...withY(at(-2, 4)))
  place('linux', 'building_lumbermill', 0, 5, rad(-15), 0.9)
  const mac = place('mac', 'building_home_A', -4, 4, 0, 1.1)
  ribbon(batch, mac.x, 0.22, mac.z + mac.box.max.z * 1.1 + 0.13, 0.4)
  sign(root, batch, 'BETA', mac.x + 0.55, mac.z + 0.7, 0.2, '#7b4f9a', '#ffffff', 0.4)
  const ios = place('ios', 'building_stage_A', -6, 5, 0, 1.1)
  siteFence(batch, ios.x, ios.z, 1.4, 1.4)
  worker(batch, ios.x + 0.2, 0, ios.z + 0.1)
  const pt = place('paratext', 'building_stage_C', -2, 6, 0, 1.1)
  scaffold(batch, pt.x + 0.05, pt.z, 1.0, 0.95, 0.95)
  crane(batch, pt.x + 0.85, pt.z - 0.6, 2.0, rad(160))
  worker(batch, pt.x - 0.55, 0, pt.z + 0.75)

  const [rq, rr] = river[4]
  const mill = place('harmony', 'building_watermill', rq - 1, rr + 0, facing(0), 1.15, 0.25, 0)
  animated.push(fire(root, mill.x - 0.05, mill.h * 0.7, mill.z - 0.1, 1.4))

  const hall = at(5, 0)
  batch.modelM('building_tavern', new THREE.Matrix4().compose(new THREE.Vector3(hall[0], 0, hall[1]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rad(-20)), new THREE.Vector3(1.4, 1.4, 1.4)), mOld)
  brokenWindow(batch, hall[0] + 0.25, 0.85, hall[1] + 0.95, rad(-20))
  anchors.set('fw-classic', new THREE.Vector3(hall[0], 2.1, hall[1]))

  const riverX = new Map(river.map(([q, r]) => [r, 2 * q + r]))
  const roadNear = (q: number, r: number) => Object.values(DIRS).some(([dq, dr]) => cells.get(key(q + dq, r + dr))?.kind === 'road')
  const fillers = ['building_home_A', 'building_home_B', 'building_home_A', 'building_well']
  for (const c of cells.values()) {
    if (c.used || c.kind !== 'grass') continue
    const [x, z] = pos(c.q, c.r)
    const d = dist(c.q, c.r)
    const east = x > (riverX.get(c.r) ?? 99)
    const hsh = Math.abs(c.q * 92821 + c.r * 68917) % 97
    const crowded = Object.values(DIRS).some(([dq, dr]) => features.has(key(c.q + dq, c.r + dr)))
    if (d > R - 2 || (!east && (crowded || !roadNear(c.q, c.r))) || (east && d > R - 2) || hsh % 4 === 0) continue
    c.used = true
    const mat = east ? mOld : undefined
    const put = (name: string, px: number, pz: number, rot: number, sc: number) =>
      batch.modelM(name, new THREE.Matrix4().compose(new THREE.Vector3(px, 0, pz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(sc, sc, sc)), mat)
    put(fillers[hsh % fillers.length], x - 0.45, z - 0.3, rad((hsh % 3) * 15 - 15), 0.85)
    put(fillers[(hsh + 1) % 3], x + 0.5, z + 0.35, rad((hsh % 5) * 10 - 20), 0.8)
    if (hsh % 3 === 0) batch.model(['barrel', 'crate_A_big', 'wheelbarrow', 'sack'][hsh % 4], x + 0.1, 0, z + 0.85, hsh)
  }

  for (const [i, outward] of [
    [0, (dirTo(river[0], river[1]) + 180) % 360],
    [river.length - 1, (dirTo(river[river.length - 1], river[river.length - 2]) + 180) % 360],
  ] as const) {
    const [x, z] = pos(...river[i])
    const a = rad(outward)
    const ex = x + Math.cos(a) * 1.0
    const ez = z - Math.sin(a) * 1.0
    batch.box(ex, -1.2, ez, 0.85, 1.05, 0.08, '#4aa3cc', a + Math.PI / 2)
    batch.box(ex + Math.cos(a) * 0.02, -2.0, ez - Math.sin(a) * 0.02, 0.8, 0.8, 0.08, '#8ccbe3', a + Math.PI / 2)
    batch.box(ex + Math.cos(a) * 0.05, -0.32, ez - Math.sin(a) * 0.05, 0.9, 0.12, 0.1, '#e9f6fb', a + Math.PI / 2)
  }

  const [bx, bz] = pos(bq, br)
  anchors.set('bridge', new THREE.Vector3(bx, 0.6, bz))

  const trees = ['trees_A_large', 'trees_B_large', 'trees_A_medium', 'trees_B_medium', 'trees_A_small']
  let n = 0
  for (const c of cells.values()) {
    if (c.used || c.kind !== 'grass') continue
    const d = dist(c.q, c.r)
    const h = Math.abs(c.q * 31 + c.r * 17 + c.q * c.r * 7)
    const [x, z] = pos(c.q, c.r)
    if (d >= R - 1 && h % 2 === 0) batch.model(trees[h % trees.length], x, 0, z, rad((h % 6) * 60))
    else if (h % 7 === 0) batch.model('hills_A_trees', x, 0, z, rad((h % 6) * 60))
    else if (h % 4 === 0) batch.model(['tree_single_A', 'tree_single_B'][n++ % 2], x + 0.4, 0, z - 0.3)
    else if (h % 5 === 0) batch.model(['rock_single_A', 'rock_single_B', 'rock_single_C'][h % 3], x - 0.3, 0, z + 0.2)
  }

  const clouds: [number, number, number, number][] = [
    [-12, -3.6, 7, 0.8],
    [12, -3.4, 5, 0.9],
    [-2, -5, 13, 0.7],
  ]
  for (const [x, y, z, s] of clouds) batch.model('cloud_big', x, y, z, x * 0.3, s)

  const group = batch.build((m) => (m instanceof THREE.MeshLambertMaterial ? m : mTop))
  root.add(group)

  const districtAnchors = {} as Record<DistrictId, THREE.Vector3>
  for (const id of ['dictionary', 'arrivals', 'riverside'] as DistrictId[]) {
    const pts = buildings.filter((b) => b.district === id).map((b) => anchors.get(b.id)!)
    const c = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length)
    districtAnchors[id] = c.setY(2.4)
  }

  return { root, anchors, districtAnchors, bounds: { cx: 0, cz: 0, rx: 2 * R, rz: R * SQ3 }, radius: 2 * R + 2, nearZoom: 44, focusZoom: 56, animated, box: new THREE.Box3(new THREE.Vector3(-2 * R - 1, -2.5, -R * SQ3 - 1), new THREE.Vector3(2 * R + 1, 1.5, R * SQ3 + 1)) }
}
