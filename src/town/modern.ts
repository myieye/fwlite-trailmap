import * as THREE from 'three'
import { buildings, type Building, type DistrictId } from './data'
import packUrl from './models/modern.glb?url'
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

const RX = 15
const RZ = 12
const outline = (t: number) => {
  const k = 1 + 0.05 * Math.sin(3 * t + 0.6) + 0.035 * Math.cos(5 * t + 1.1) + 0.02 * Math.sin(8 * t)
  return [RX * k * Math.cos(t), RZ * k * Math.sin(t)] as const
}
const riverC = (z: number) => 3.2 + 1.6 * Math.sin(z * 0.32 + 0.4)
const RW = 1.05

const city: Cells = {
  '4,1': ['#e2805f', '#a5452f'],
}
const hexCells: Cells = {
  '0,2': ['#b5cf8e', '#6f9a5e'],
  '1,2': ['#5f9e6c', '#1f5a4a'],
  '4,1': ['#8fbf6a', '#3e7a4f'],
  '0,3': ['#d9744e', '#9c4029'],
  '2,2': ['#c9c6bd', '#8e8b84'],
  '2,1': ['#b57f57', '#7a4b33'],
}

function shapeOf(pts: [number, number][]) {
  const s = new THREE.Shape()
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)))
  s.closePath()
  return s
}

function slab(pts: [number, number][], y0: number, depth: number, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shapeOf(pts), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0, 0)
  return g
}

export async function buildModern(): Promise<World> {
  const scene = await loadPack(packUrl)
  const lib = new Library(scene)
  const maps = new Map<THREE.Material, THREE.Material>()
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const m = o.material as THREE.MeshStandardMaterial
    if (maps.has(m) || !m.map) return
    const cells = m.name.startsWith('hexagons') ? hexCells : city
    maps.set(m, new THREE.MeshLambertMaterial({ map: recolorAtlas(m.map, cells), vertexColors: true }))
  })
  const paint = [...maps.values()][0]
  const batch = new Batch(lib, paint)
  const root = new THREE.Group()
  const animated: World['animated'] = []
  const I = new THREE.Matrix4()

  const N = 160
  const ring: [number, number][] = []
  for (let i = 0; i < N; i++) ring.push(outline((i / N) * Math.PI * 2) as [number, number])
  const west = ring.map((p, i) => ({ p, i })).filter(({ p }) => p[0] < riverC(p[1]) - RW)
  const east = ring.map((p, i) => ({ p, i })).filter(({ p }) => p[0] > riverC(p[1]) + RW)
  const arc = (items: { p: [number, number]; i: number }[]) => {
    const idx = new Set(items.map((x) => x.i))
    const start = items.find(({ i }) => !idx.has((i - 1 + N) % N))!.i
    const out: [number, number][] = []
    for (let k = 0; k < items.length; k++) out.push(ring[(start + k) % N])
    return out
  }
  const bank = (z0: number, z1: number, side: number) => {
    const out: [number, number][] = []
    const n = 40
    for (let k = 0; k <= n; k++) {
      const z = z0 + ((z1 - z0) * k) / n
      out.push([riverC(z) + side * RW, z])
    }
    return out
  }
  const wArc = arc(west)
  const eArc = arc(east)
  const wPoly = [...wArc, ...bank(wArc[wArc.length - 1][1], wArc[0][1], -1)]
  const ePoly = [...eArc, ...bank(eArc[eArc.length - 1][1], eArc[0][1], 1)]
  const inset = (pts: [number, number][], k: number) => pts.map(([x, z]) => [x * k, z * k] as [number, number])

  for (const poly of [wPoly, ePoly]) {
    batch.shape(slab(poly, -0.35, 0.3, 0.06), I, '#8fbf72')
    batch.shape(slab(poly, -0.95, 0.6), I, '#a57f5a')
  }
  batch.shape(slab(ring, -1.0, 0.65), I, '#8a6a4c')
  batch.shape(slab(inset(ring, 0.97), -2.2, 1.2), I, '#7b7468')
  batch.shape(slab(inset(ring, 0.86), -3.3, 1.1), I, '#69645c')
  batch.shape(slab(inset(ring, 0.62), -4.1, 0.8), I, '#5c5852')

  const water = new THREE.Mesh(
    slab(inset(ring, 0.995), -0.2, 0.01),
    new THREE.MeshLambertMaterial({ color: '#4ba3cc' }),
  )
  water.receiveShadow = true
  root.add(water)
  for (const top of [true, false]) {
    let best = -1
    let bd = Infinity
    for (let i = 0; i < N; i++) {
      const [x, z] = ring[i]
      const d = Math.abs(x - riverC(z))
      if (top === z < 0 && d < bd) {
        bd = d
        best = i
      }
    }
    const [x, z] = ring[best]
    const [x2, z2] = ring[(best + 1) % N]
    const rot = -Math.atan2(z2 - z, x2 - x)
    const nx = Math.sin(rot)
    const nz = Math.cos(rot)
    const out = Math.sign(x * nx + z * nz) * 0.06
    batch.box(x + nx * out, -1.15, z + nz * out, RW * 2, 0.97, 0.06, '#5fb3d8', rot)
    batch.box(x + nx * out * 1.6, -2.3, z + nz * out * 1.6, RW * 1.7, 1.2, 0.06, '#8ccbe3', rot)
    batch.box(x + nx * out * 2, -0.27, z + nz * out * 2, RW * 2.1, 0.1, 0.1, '#eaf7fc', rot)
  }

  const asphalt = '#4d5560'
  const walk = '#d9d2c3'
  const road = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0)
    const rot = -Math.atan2(z1 - z0, x1 - x0)
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    batch.box(cx, -0.05, cz, len + 1.6, 0.08, 1.9, walk, rot)
    batch.box(cx, -0.04, cz, len + 1.2, 0.08, 1.25, asphalt, rot)
    const n = Math.floor(len / 0.7)
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n - 0.5
      batch.box(cx + Math.cos(rot) * t * len, 0.045, cz - Math.sin(rot) * t * len, 0.3, 0.01, 0.06, '#f3e9c9', rot)
    }
  }
  const BRIDGE_Z = 0.5
  const bx = riverC(BRIDGE_Z)
  road(-12, BRIDGE_Z, bx - RW - 0.6, BRIDGE_Z)
  road(-6.5, -8, -6.5, 10.2)
  road(bx + RW + 0.6, BRIDGE_Z, 11, BRIDGE_Z)
  batch.box(bx, -0.1, BRIDGE_Z, RW * 2 + 1.6, 0.22, 1.5, '#c9c2b4')
  batch.box(bx, 0.07, BRIDGE_Z, RW * 2 + 1.4, 0.04, 1.2, asphalt)
  for (const s of [-1, 1]) {
    batch.box(bx, 0.08, BRIDGE_Z + s * 0.72, RW * 2 + 1.6, 0.22, 0.07, '#e9e3d6')
    for (let k = -2; k <= 2; k++) batch.box(bx + k * 0.5, 0.08, BRIDGE_Z + s * 0.72, 0.09, 0.3, 0.1, '#e9e3d6')
  }
  batch.box(bx, -0.9, BRIDGE_Z, 0.5, 0.85, 1.3, '#bfb8aa')

  const anchors = new Map<string, THREE.Vector3>()
  const byId = Object.fromEntries(buildings.map((b) => [b.id, b])) as Record<string, Building>
  const q = (a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a)

  const skeleton = (x: number, z: number, floors: number, w = 1.7, d = 1.7) => {
    batch.box(x, 0, z, w + 0.2, 0.08, d + 0.2, '#b9b4aa')
    for (let f = 0; f < floors; f++) {
      const y = 0.08 + f * 0.55
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) batch.box(x + (sx * w) / 2.3, y, z + (sz * d) / 2.3, 0.1, 0.55, 0.1, '#c8c3b8')
      batch.box(x, y + 0.5, z, w, 0.07, d, '#d6d1c6')
    }
  }

  const place = (id: string, model: string, x: number, z: number, rot = 0, scale = 1) => {
    const b = byId[id]
    const box = lib.box(model)
    const h = box.max.y * scale
    if (b.state === 'planned') {
      batch.box(x, -0.04, z, 2.1 * scale, 0.06, 2.1 * scale, '#c9b99a')
      const ghost = new THREE.Group()
      for (const p of lib.parts(model)) ghost.add(new THREE.Mesh(p.geo, ghostMaterial()))
      ghost.position.set(x, 0.02, z)
      ghost.rotation.y = rot
      ghost.scale.setScalar(scale)
      root.add(ghost)
      dashedBox(root, x, 0.02, z, 2 * scale, h, 2 * scale)
      sign(root, batch, 'PLANNED', x + 0.6, z + 1.35, 0, '#fff7e6', '#1d2a3f', 0.6)
    } else batch.modelM(model, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), q(rot), new THREE.Vector3(scale, scale, scale)))
    if (b.broken)
      for (let i = 0; i < b.broken; i++) brokenWindow(batch, x - 0.45 + i * 0.55, h * 0.55, z + scale + 0.01, 0)
    anchors.set(id, new THREE.Vector3(x, h + 0.2, z))
    return { x, z, h }
  }
  const site = (id: string, x: number, z: number, floors: number) => {
    skeleton(x, z, floors)
    anchors.set(id, new THREE.Vector3(x, floors * 0.55 + 0.3, z))
    return { x, z, h: floors * 0.55 }
  }

  const ed = place('entry-editor', 'building_H', -9.2, -2.4, 0, 1.2)
  crane(batch, ed.x + 1.6, ed.z - 1.1, 4.4, Math.PI * 0.85)
  worker(batch, ed.x + 1.0, 0, ed.z + 1.6)
  worker(batch, ed.x + 1.3, 0, ed.z + 1.4, '#ffd23a')
  place('entry-list', 'building_C', -4.0, -2.6, 0, 1.05)
  place('history', 'building_E', -9.2, 3.2, 0, 1)
  const cf = site('complex-forms', -4.0, -6.2, 3)
  scaffold(batch, cf.x, cf.z, 1.8, 1.8, cf.h)
  crane(batch, cf.x - 1.5, cf.z - 1.0, 3.2, 0.3)
  worker(batch, cf.x + 0.6, 0, cf.z + 1.3)
  place('custom-fields', 'building_D', -9.2, -7.4, 0, 1)

  place('windows', 'building_A', -4.0, 3.6, 0, 1)
  place('android', 'building_F', -1.2, 3.6, 0, 1)
  place('linux', 'building_G', -1.2, -2.6, 0, 1)
  const mac = place('mac', 'building_B', -4.0, 7.2, 0, 1)
  ribbon(batch, mac.x, 0.25, mac.z + 1.06, 0.6)
  sign(root, batch, 'BETA', mac.x + 1.25, mac.z + 1.3, 0, '#7b4f9a', '#ffffff', 0.5)
  const ios = site('ios', -9.2, 7.6, 1)
  siteFence(batch, ios.x, ios.z, 2.4, 2.4, 0.8)
  worker(batch, ios.x + 0.3, 0.6, ios.z)
  const pt = site('paratext', -1.2, 7.4, 2)
  scaffold(batch, pt.x, pt.z, 1.8, 1.8, pt.h)
  crane(batch, pt.x + 1.6, pt.z - 0.8, 3.0, Math.PI * 0.9)
  worker(batch, pt.x - 0.5, 0, pt.z + 1.3)

  const hz = 4.4
  const hx = riverC(hz) - RW - 1.3
  batch.modelM('building_A', new THREE.Matrix4().compose(new THREE.Vector3(hx, 0, hz), q(Math.PI / 2), new THREE.Vector3(1, 0.8, 1)))
  batch.modelM('watertower', new THREE.Matrix4().compose(new THREE.Vector3(hx + 0.2, 1.32, hz - 0.3), q(0), new THREE.Vector3(2.2, 2.2, 2.2)))
  for (const dz of [-0.4, 0.4]) {
    batch.box(hx + 1.3, 0.25, hz + dz, 1.2, 0.18, 0.18, '#7c8ea0')
    batch.box(hx + 1.95, -0.25, hz + dz, 0.18, 0.68, 0.18, '#7c8ea0')
  }
  anchors.set('harmony', new THREE.Vector3(hx, 3.0, hz))
  animated.push(fire(root, hx - 0.2, 1.4, hz + 0.3, 1.5))

  const old: [string, number, number, number, number][] = [
    ['building_tavern', 8.4, -2.6, -0.3, 1.5],
    ['building_home_A', 6.6, -4.3, 0.2, 1.3],
    ['building_home_B', 10.6, -3.6, -0.2, 1.3],
    ['building_market', 8.6, 3.0, 0.1, 1.3],
    ['building_home_A', 11.2, 2.6, -0.4, 1.3],
    ['building_home_B', 6.4, 3.6, 0.3, 1.3],
    ['building_well', 9.8, -0.9, 0, 1.3],
    ['building_home_A', 7.2, 6.4, 0.1, 1.2],
    ['building_home_B', 10.0, 5.6, -0.1, 1.2],
  ]
  for (const [m, x, z, r, s] of old) batch.modelM(m, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), q(r), new THREE.Vector3(s, s, s)))
  brokenWindow(batch, 8.6, 0.95, -1.75, -0.3)
  anchors.set('fw-classic', new THREE.Vector3(8.4, 2.4, -2.6))

  const lamps: [number, number, number][] = []
  for (let x = -11; x <= 1; x += 3) lamps.push([x, BRIDGE_Z + 1.0, Math.PI / 2])
  for (let z = -7; z <= 9; z += 3.2) lamps.push([-5.5, z, 0])
  for (const [x, z, r] of lamps) batch.model('streetlight', x, 0, z, r)
  const cars: [string, number, number, number][] = [
    ['car_taxi', -8, BRIDGE_Z - 0.3, Math.PI / 2],
    ['car_sedan', -2.4, BRIDGE_Z + 0.3, -Math.PI / 2],
    ['car_hatchback', -6.8, 5.2, 0],
    ['car_stationwagon', -6.2, -4.4, Math.PI],
  ]
  for (const [m, x, z, r] of cars) batch.model(m, x, 0.03, z, r, 1.1)

  const trees = ['trees_A_large', 'trees_B_large', 'trees_A_medium', 'trees_B_medium', 'trees_A_small']
  const occupied = (x: number, z: number) =>
    [...anchors.values()].some((a) => Math.hypot(a.x - x, a.z - z) < 2.3) ||
    old.some(([, ox, oz]) => Math.hypot(ox - x, oz - z) < 1.7) ||
    Math.abs(z - BRIDGE_Z) < 1.6 ||
    Math.abs(x + 6.5) < 1.4 ||
    Math.abs(x - riverC(z)) < RW + 0.9
  let n = 0
  for (let i = 0; i < 220; i++) {
    const t = i * 2.399963
    const r = Math.sqrt((i + 0.5) / 220)
    const [ox, oz] = outline(t)
    const x = ox * r * 0.92
    const z = oz * r * 0.92
    if (occupied(x, z)) continue
    const edge = r > 0.78
    if (edge && i % 3 !== 0) batch.model(trees[i % trees.length], x, 0, z, t, 0.75)
    else if (!edge && i % 5 === 0) batch.model(['tree_single_A', 'tree_single_B', 'bush'][n++ % 3], x, 0, z, t, n % 3 === 2 ? 1.6 : 1)
  }
  for (const [x, z] of [
    [-11.5, -0.4],
    [-2.8, 1.6],
    [-7.6, 1.7],
  ])
    batch.model('bench', x, 0, z, 0, 1.4)

  const clouds: [number, number, number, number][] = [
    [-15, -4, 6, 0.9],
    [15, -3.6, 4, 1],
    [-3, -5.5, 14, 0.8],
  ]
  for (const [x, y, z, s] of clouds) batch.model('cloud_big', x, y, z, x * 0.3, s)

  root.add(batch.build((m) => maps.get(m) ?? m))

  const districtAnchors = {} as Record<DistrictId, THREE.Vector3>
  for (const id of ['dictionary', 'arrivals', 'riverside'] as DistrictId[]) {
    const pts = buildings.filter((b) => b.district === id).map((b) => anchors.get(b.id)!)
    const c = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length)
    districtAnchors[id] = c.setY(3.4)
  }
  return {
    root,
    anchors,
    districtAnchors,
    bounds: { cx: 0, cz: 0, rx: RX, rz: RZ },
    radius: RX + 2,
    nearZoom: 31,
    focusZoom: 36,
    animated,
    box: new THREE.Box3(new THREE.Vector3(-RX - 0.5, -3, -RZ - 0.5), new THREE.Vector3(RX + 0.5, 2.5, RZ + 0.5)),
  }
}
