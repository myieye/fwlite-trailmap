import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface World {
  root: THREE.Group
  /** Label point above each node's building. */
  anchors: Map<string, THREE.Vector3>
  districtAnchors: Map<string, THREE.Vector3>
  /** Centres of the ground cells each district owns. */
  grounds: Map<string, THREE.Vector3[]>
  /** The district whose ground is at or near this point. */
  districtAt: (x: number, z: number) => string | undefined
  /** Ellipse the camera target stays inside. */
  bounds: { cx: number; cz: number; rx: number; rz: number }
  radius: number
  /** Pixels per world unit at which building labels replace district names, and the zoom a district tap goes to. */
  nearZoom: number
  focusZoom: number
  /** What the default view frames. */
  box: THREE.Box3
  animated: Animated[]
}

export type Animated = { pos: THREE.Vector3; tick: (t: number) => void }

export type Projected = { id: string; x: number; y: number; on: boolean }
export type View = { zoom: number; minZoom: number; points: Projected[]; district?: string }

export type Cells = Record<string, [string, string]>

export async function loadPack(url: string) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  // Claude artifacts' CSP blocks fetch() of data: URLs, so inlined models are decoded here instead.
  const gltf = url.startsWith('data:')
    ? await loader.parseAsync(Uint8Array.from(atob(url.slice(url.indexOf(',') + 1)), (c) => c.charCodeAt(0)).buffer, '')
    : await loader.loadAsync(url)
  gltf.scene.updateMatrixWorld(true)
  return gltf.scene
}

/** Repaints swatches of the 8x4 gradient atlas KayKit uses, scaling each pixel by its row's base so detail inside a swatch survives. */
export function recolorAtlas(src: THREE.Texture, cells: Cells, size = 256) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(src.image as CanvasImageSource, 0, 0, size, size)
  const img = g.getImageData(0, 0, size, size)
  const d = img.data
  const cw = size / 8
  const ch = size / 4
  const tmp = new THREE.Color()
  for (const [key, [top, bottom]] of Object.entries(cells)) {
    const [cx, cy] = key.split(',').map(Number)
    const a = new THREE.Color().setStyle(top, THREE.LinearSRGBColorSpace)
    const b = new THREE.Color().setStyle(bottom, THREE.LinearSRGBColorSpace)
    for (let y = 0; y < ch; y++) {
      const t = y / (ch - 1)
      tmp.copy(a).lerp(b, t)
      const row = (cy * ch + y) * size
      const base = (row + cx * cw) * 4
      const br = d[base] || 1
      const bg = d[base + 1] || 1
      const bb = d[base + 2] || 1
      for (let x = 0; x < cw; x++) {
        const i = (row + cx * cw + x) * 4
        d[i] = Math.min(255, tmp.r * 255 * (d[i] / br))
        d[i + 1] = Math.min(255, tmp.g * 255 * (d[i + 1] / bg))
        d[i + 2] = Math.min(255, tmp.b * 255 * (d[i + 2] / bb))
      }
    }
  }
  g.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.flipY = false
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

function toFloat(src: THREE.BufferGeometry) {
  const out = new THREE.BufferGeometry()
  for (const name of ['position', 'normal', 'uv'] as const) {
    const a = src.getAttribute(name)
    const n = name === 'uv' ? 2 : 3
    const arr = new Float32Array(a.count * n)
    for (let i = 0; i < a.count; i++) {
      arr[i * n] = a.getX(i)
      arr[i * n + 1] = a.getY(i)
      if (n === 3) arr[i * n + 2] = a.getZ(i)
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, n))
  }
  out.setIndex(src.index ? Array.from(src.index.array) : null)
  return out
}

/** Every model a pack holds, baked into one geometry per (top node, material). */
export class Library {
  private cache = new Map<string, { geo: THREE.BufferGeometry; mat: THREE.Material }[]>()
  constructor(private scene: THREE.Object3D) {}
  names() {
    return this.scene.children.map((c) => c.name)
  }
  parts(name: string) {
    let parts = this.cache.get(name)
    if (parts) return parts
    const node = this.scene.getObjectByName(name)
    if (!node) throw new Error(`no model ${name}`)
    const inv = node.matrixWorld.clone().invert()
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>()
    node.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return
      const g = toFloat(o.geometry)
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))
      const m = o.material as THREE.Material
      byMat.set(m, [...(byMat.get(m) ?? []), g])
    })
    parts = [...byMat].map(([mat, geos]) => ({ mat, geo: geos.length > 1 ? mergeGeometries(geos)! : geos[0] }))
    this.cache.set(name, parts)
    return parts
  }
  box(name: string) {
    const b = new THREE.Box3()
    for (const p of this.parts(name)) {
      p.geo.computeBoundingBox()
      b.union(p.geo.boundingBox!)
    }
    return b
  }
}

const UP = new THREE.Vector3(0, 1, 0)
const WHITE_UV = [0.19, 0.004] as const

/** Collects static geometry per material and merges it, so the whole town is a handful of draw calls. */
export class Batch {
  private groups = new Map<THREE.Material, THREE.BufferGeometry[]>()
  constructor(
    private lib: Library,
    private paint: THREE.Material,
  ) {}
  model(name: string, x: number, y: number, z: number, rotY = 0, scale = 1, tint?: THREE.Color) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(UP, rotY),
      new THREE.Vector3(scale, scale, scale),
    )
    this.modelM(name, m, undefined, tint)
  }
  modelM(name: string, m: THREE.Matrix4, mat?: THREE.Material, tint: THREE.ColorRepresentation = '#ffffff') {
    for (const p of this.lib.parts(name)) this.push(mat ?? p.mat, p.geo.clone().applyMatrix4(m), tint)
  }
  /** Procedural geometry painted with a flat color through the atlas' white swatch. */
  shape(geo: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.ColorRepresentation) {
    const g = geo.clone().applyMatrix4(m)
    const uv = new Float32Array(g.getAttribute('position').count * 2)
    for (let i = 0; i < uv.length; i += 2) {
      uv[i] = WHITE_UV[0]
      uv[i + 1] = WHITE_UV[1]
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k)
    this.push(this.paint, g, color)
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: THREE.ColorRepresentation, rotY = 0) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y + h / 2, z),
      new THREE.Quaternion().setFromAxisAngle(UP, rotY),
      new THREE.Vector3(w, h, d),
    )
    this.shape(unitBox, m, color)
  }
  private push(mat: THREE.Material, g: THREE.BufferGeometry, color: THREE.ColorRepresentation) {
    const c = new THREE.Color(color)
    const n = g.getAttribute('position').count
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3)
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    if (!g.index) {
      const idx = new Uint32Array(n)
      for (let i = 0; i < n; i++) idx[i] = i
      g.setIndex(new THREE.BufferAttribute(idx, 1))
    }
    this.groups.set(mat, [...(this.groups.get(mat) ?? []), g])
  }
  build(materialFor: (m: THREE.Material) => THREE.Material) {
    const group = new THREE.Group()
    for (const [mat, geos] of this.groups) {
      const mesh = new THREE.Mesh(mergeGeometries(geos)!, materialFor(mat))
      mesh.castShadow = mesh.receiveShadow = true
      group.add(mesh)
    }
    return group
  }
}

export const unitBox = new THREE.BoxGeometry(1, 1, 1)
const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8)
const sphere = new THREE.SphereGeometry(0.5, 10, 8)
const hemi = new THREE.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2)

export const ink = '#1d2a3f'
export const rust = '#e8572a'
export const sun = '#f0a31a'

const at = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  )

/** `h` is mast height; the jib points along `rot`. */
export function crane(b: Batch, x: number, z: number, h: number, rot = 0, y = 0) {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const p = (u: number) => [x + c * u, z - s * u] as const
  b.box(x, y, z, 0.14, h, 0.14, sun)
  for (let k = 0.3; k < h - 0.1; k += 0.3) b.box(x, y + k, z, 0.17, 0.03, 0.17, '#c47f10')
  b.box(x, y + h, z, 0.22, 0.14, 0.22, ink)
  const [jx, jz] = p(0.55)
  b.box(jx, y + h + 0.14, jz, 1.5, 0.07, 0.08, sun, rot)
  const [kx, kz] = p(-0.35)
  b.box(kx, y + h + 0.1, kz, 0.24, 0.16, 0.18, '#53606f', rot)
  b.box(x, y + h + 0.14, z, 0.06, 0.32, 0.06, sun)
  const [hx, hz] = p(1.0)
  b.box(hx, y + h * 0.45, hz, 0.012, h * 0.55 + 0.14, 0.012, ink)
  b.box(hx, y + h * 0.45 - 0.06, hz, 0.07, 0.06, 0.07, ink)
}

export function worker(b: Batch, x: number, y: number, z: number, vest: string = '#f26b21') {
  b.shape(cyl, at(x, y + 0.06, z, 0.05, 0.12, 0.05), '#33415c')
  b.shape(cyl, at(x, y + 0.16, z, 0.075, 0.1, 0.075), vest)
  b.shape(sphere, at(x, y + 0.245, z, 0.065, 0.065, 0.065), '#c8916a')
  b.shape(hemi, at(x, y + 0.26, z, 0.085, 0.07, 0.085), '#ffd23a')
}

export function siteFence(b: Batch, x: number, z: number, w: number, d: number, gap = 0.5) {
  const h = 0.16
  const sides: [number, number, number, number][] = [
    [x - w / 2, z + d / 2, x + w / 2, z + d / 2],
    [x + w / 2, z + d / 2, x + w / 2, z - d / 2],
    [x + w / 2, z - d / 2, x - w / 2, z - d / 2],
    [x - w / 2, z - d / 2, x - w / 2, z + d / 2],
  ]
  sides.forEach(([x0, z0, x1, z1], i) => {
    const len = Math.hypot(x1 - x0, z1 - z0)
    const rot = -Math.atan2(z1 - z0, x1 - x0)
    const n = Math.max(2, Math.round(len / 0.32))
    for (let k = 0; k < n; k++) {
      const t0 = k / n
      const t1 = (k + 0.82) / n
      const mid = (t0 + t1) / 2
      if (i === 0 && Math.abs(mid - 0.5) < gap / len / 2) continue
      const cx = x0 + (x1 - x0) * mid
      const cz = z0 + (z1 - z0) * mid
      const seg = len * (t1 - t0)
      b.box(cx, 0, cz, seg, h, 0.03, k % 2 ? '#ffffff' : '#f26b21', rot)
      b.box(cx, h * 0.45, cz, seg * 1.01, 0.03, 0.035, k % 2 ? '#f26b21' : '#ffffff', rot)
    }
  })
}

export function scaffold(b: Batch, x: number, z: number, w: number, d: number, h: number) {
  const pole = '#9aa3ad'
  const plank = '#c99a5b'
  const xs = [-w / 2, 0, w / 2]
  const levels = Math.max(1, Math.round(h / 0.38))
  for (const side of [1, -1]) {
    const fz = z + (side * d) / 2 + side * 0.09
    for (const dx of xs) b.box(x + dx, 0, fz, 0.03, h + 0.12, 0.03, pole)
    for (let l = 1; l <= levels; l++) {
      const y = (l / levels) * h
      b.box(x, y, fz, w + 0.06, 0.03, 0.14, plank)
      b.box(x, y + 0.14, fz + side * 0.06, w + 0.06, 0.02, 0.02, pole)
    }
    b.shape(unitBox, at(x, h * 0.5, fz + side * 0.07, w * 1.04, 0.025, 0.02, 0, Math.atan2(h, w)), pole)
  }
  for (const side of [1, -1]) {
    const fx = x + (side * w) / 2 + side * 0.09
    for (const dz of [-d / 2, d / 2]) b.box(fx, 0, z + dz, 0.03, h + 0.12, 0.03, pole)
    for (let l = 1; l <= levels; l++) b.box(fx, (l / levels) * h, z, 0.14, 0.03, d + 0.2, plank)
  }
}

/** On the +z face. */
export function brokenWindow(b: Batch, x: number, y: number, z: number, rot = 0) {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const px = x + s * 0.02
  const pz = z + c * 0.02
  b.box(x, y - 0.09, z, 0.17, 0.18, 0.012, '#141c2b', rot)
  b.shape(unitBox, at(px, y, pz, 0.24, 0.035, 0.02, rot, 0.6), '#b07a45')
  b.shape(unitBox, at(px + s * 0.005, y, pz + c * 0.005, 0.24, 0.035, 0.02, rot, -0.5), '#c08a52')
}

export function textTexture(text: string, bg: string, fg: string, w = 256, h = 96) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)
  g.strokeStyle = fg
  g.lineWidth = 6
  g.strokeRect(8, 8, w - 16, h - 16)
  g.fillStyle = fg
  g.font = `700 ${h * 0.42}px "Figtree Variable", system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, w / 2, h / 2 + 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Faces +z before `rot`. */
export function sign(group: THREE.Group, b: Batch, text: string, x: number, z: number, rot: number, bg: string, fg: string, w = 0.5) {
  const h = w * 0.38
  const postH = 0.42
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  for (const side of [-1, 1]) b.box(x + c * side * w * 0.4, 0, z - s * side * w * 0.4, 0.035, postH, 0.035, '#6b4a2e')
  b.box(x - s * 0.012, postH - h - 0.02, z - c * 0.012, w + 0.04, h + 0.04, 0.025, '#6b4a2e', rot)
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(text, bg, fg) }))
  board.position.set(x + s * 0.002, postH - h / 2 - 0.02, z + c * 0.002)
  board.rotation.y = rot
  group.add(board)
}

/** Across a doorway on the +z face. */
export function ribbon(b: Batch, x: number, y: number, z: number, w: number, rot = 0) {
  b.box(x, y, z, w, 0.045, 0.02, '#d8342a', rot)
  b.shape(sphere, at(x, y + 0.02, z, 0.09, 0.07, 0.03, rot), '#e8473a')
  b.shape(unitBox, at(x - 0.03, y - 0.05, z, 0.025, 0.1, 0.012, rot, 0.4), '#d8342a')
  b.shape(unitBox, at(x + 0.03, y - 0.05, z, 0.025, 0.1, 0.012, rot, -0.4), '#d8342a')
}

let puff: THREE.Texture | undefined
function puffTexture() {
  if (puff) return puff
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.6)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  puff = new THREE.CanvasTexture(c)
  return puff
}

export function fire(group: THREE.Group, x: number, y: number, z: number, size = 1) {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  g.scale.setScalar(size)
  group.add(g)
  const flameGeo = new THREE.ConeGeometry(0.5, 1, 7, 1, true)
  flameGeo.translate(0, 0.5, 0)
  const flames: { m: THREE.Mesh; base: number; ph: number }[] = []
  const spots: [number, number, number, string][] = [
    [0, 0, 0.42, '#ff6a1f'],
    [-0.16, 0.08, 0.3, '#ff8a1f'],
    [0.15, -0.06, 0.34, '#ff7a1f'],
    [0, 0.02, 0.22, '#ffd34a'],
    [-0.05, -0.1, 0.18, '#ffe27a'],
  ]
  spots.forEach(([fx, fz, s, color], i) => {
    const m = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }))
    m.position.set(fx, 0, fz)
    m.scale.set(s * 0.55, s, s * 0.55)
    m.renderOrder = 3
    g.add(m)
    flames.push({ m, base: s, ph: i * 1.7 })
  })
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTexture(), color: '#ffb347', transparent: true, opacity: 0.55, depthWrite: false }))
  glow.scale.setScalar(1.1)
  glow.position.y = 0.2
  g.add(glow)
  const smoke: { s: THREE.Sprite; ph: number }[] = []
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTexture(), color: '#5d6270', transparent: true, depthWrite: false }))
    g.add(s)
    smoke.push({ s, ph: i / 12 })
  }
  const tick = (t: number) => {
    for (const f of flames) {
      const k = 1 + 0.18 * Math.sin(t * 9 + f.ph) + 0.1 * Math.sin(t * 15.3 + f.ph * 2)
      f.m.scale.y = f.base * k
      f.m.rotation.y = t * 0.6 + f.ph
    }
    glow.material.opacity = 0.45 + 0.1 * Math.sin(t * 7)
    for (const p of smoke) {
      const u = (t * 0.16 + p.ph) % 1
      p.s.position.set(Math.sin(u * 5 + p.ph * 9) * 0.12 + u * 0.5, 0.35 + u * 2.3, -u * 0.25)
      p.s.scale.setScalar(0.3 + u * 1.0)
      p.s.material.opacity = Math.min(1, u * 6) * (1 - u) * 0.5
    }
  }
  tick(0)
  return { pos: new THREE.Vector3(x, y, z), tick }
}

export function ghostMaterial() {
  return new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, depthWrite: false })
}

export function dashedBox(group: THREE.Group, x: number, y: number, z: number, w: number, h: number, d: number) {
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d))
  const line = new THREE.LineSegments(geo, new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.9 }))
  line.computeLineDistances()
  line.position.set(x, y + h / 2, z)
  group.add(line)
}

