<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { onMount, untrack } from 'svelte'
  import type { Animated, Projected, View, World } from './world'

  let {
    world: worldProp,
    onview,
    onpick,
    focus,
    insets,
  }: {
    world: World
    onview: (v: View) => void
    onpick: (id: string | null) => void
    focus: string[]
    insets: () => { top: number; bottom: number }
  } = $props()

  const world = untrack(() => worldProp)
  const { renderer, invalidate, dom, size } = useThrelte()
  const AZ = (38 * Math.PI) / 180
  const EL = ((innerHeight > innerWidth ? 62 : 34) * Math.PI) / 180
  const dir = new THREE.Vector3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL))

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)
  const target = new THREE.Vector3(world.bounds.cx, 0, world.bounds.cz)
  let zoom = 30
  let minZoom = 10
  let maxZoom = 160

  const dusk = matchMedia('(prefers-color-scheme: dark)').matches
  const light = new THREE.DirectionalLight(dusk ? '#ffb489' : '#ffe7c2', dusk ? 1.7 : 2.6)
  light.position.set(-14, 22, 12)
  light.castShadow = true
  const r = world.radius
  Object.assign(light.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 80 })
  light.shadow.mapSize.setScalar(matchMedia('(pointer: coarse)').matches ? 1024 : 2048)
  light.shadow.bias = -0.0008
  light.shadow.normalBias = 0.02
  light.shadow.radius = 3

  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const ray = new THREE.Raycaster()
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const v = new THREE.Vector3()

  function groundAt(px: number, py: number) {
    const { width, height } = size.current
    ray.setFromCamera(new THREE.Vector2((px / width) * 2 - 1, -(py / height) * 2 + 1), camera)
    return ray.ray.intersectPlane(ground, new THREE.Vector3()) ?? target.clone()
  }

  function clamp() {
    zoom = Math.min(maxZoom, Math.max(minZoom, zoom))
    const { cx, cz, rx, rz } = world.bounds
    const dx = (target.x - cx) / rx
    const dz = (target.z - cz) / rz
    const k = Math.hypot(dx, dz)
    if (k > 1) target.set(cx + (dx / k) * rx, 0, cz + (dz / k) * rz)
  }

  function apply() {
    clamp()
    const { width, height } = size.current
    Object.assign(camera, { left: -width / 2, right: width / 2, top: height / 2, bottom: -height / 2, zoom })
    camera.position.copy(target).addScaledVector(dir, 120)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    const points: Projected[] = []
    const all = [...world.anchors, ...[...world.districtAnchors].map(([k, p]) => [`d:${k}`, p] as const)]
    for (const [id, p] of all) {
      v.copy(p).project(camera)
      const x = ((v.x + 1) / 2) * width
      const y = ((1 - v.y) / 2) * height
      points.push({ id, x, y, on: x > -40 && x < width + 40 && y > -40 && y < height + 40 })
    }
    visible = reduced
      ? []
      : world.animated.filter((a) => {
          v.copy(a.pos).project(camera)
          return Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.3
        })
    fireOn = visible.length > 0
    onview({ zoom, minZoom, points })
    invalidate()
  }

  function fit() {
    const { width, height } = size.current
    camera.position.copy(dir).multiplyScalar(120)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    const inv = camera.matrixWorldInverse
    const b = world.box
    const ext = new THREE.Box3()
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) ext.expandByPoint(v.set(x, y, z).applyMatrix4(inv))
    const { top, bottom } = insets()
    const room = Math.max(height * 0.5, height - top - bottom)
    const portrait = height > width
    minZoom = Math.min((width * (portrait ? 1.02 : 0.9)) / (ext.max.x - ext.min.x), Math.min(height * 0.86, room * 1.04) / (ext.max.y - ext.min.y))
    maxZoom = Math.max(minZoom * 6, 140)
    homeZoom = minZoom
    let cx = (ext.min.x + ext.max.x) / 2
    let cy = (ext.min.y + ext.max.y) / 2
    if (portrait || height < 500) {
      // Fit the buildings worth labelling rather than the island: on a phone the whole island is too small to read.
      const f = new THREE.Box3()
      for (const id of focus) {
        const p = world.anchors.get(id)
        if (p) f.expandByPoint(v.copy(p).applyMatrix4(inv))
      }
      if (!f.isEmpty()) {
        const fw = Math.max(f.max.x - f.min.x, 1)
        const fh = Math.max(f.max.y - f.min.y, 1)
        homeZoom = Math.min(Math.max(minZoom, Math.min((width - 40) / fw, (room * 0.85 - 30) / fh)), minZoom * 2.4)
        cx = (f.min.x + f.max.x) / 2
        if (!portrait) cy = (f.min.y + f.max.y) / 2
      }
    }
    cy -= (height / 2 - (top + room / 2)) / homeZoom
    const c = new THREE.Vector3(cx, cy, 0).applyMatrix4(camera.matrixWorld)
    home.copy(c).addScaledVector(dir, -c.y / dir.y)
  }

  let homeZoom = 1
  const home = new THREE.Vector3()

  /** Moves a node out from under the sheet or panel; `close` also zooms in to building level. */
  export function reveal(id: string, close = false) {
    const p = world.anchors.get(id)
    if (!p) return
    if (close && zoom < world.focusZoom) {
      target.set(p.x, 0, p.z)
      zoom = Math.max(world.focusZoom, minZoom * 1.6)
      apply()
    }
    const { width, height } = size.current
    v.copy(p).project(camera)
    const x = ((v.x + 1) / 2) * width
    const y = ((1 - v.y) / 2) * height
    const sheet = width <= 700
    const tx = sheet ? width / 2 : Math.min(x, width - 420)
    const ty = sheet ? height * 0.3 : y
    if (Math.abs(tx - x) < 2 && Math.abs(ty - y) < 2) return
    const a = groundAt(x, y)
    const b = groundAt(tx, ty)
    target.add(a.sub(b))
    apply()
  }

  let fireOn = $state(false)
  let visible: Animated[] = []
  let t = 0
  useTask(
    (delta) => {
      t += delta
      for (const a of visible) a.tick(t)
    },
    { running: () => fireOn },
  )

  let fitted = false
  $effect(() => {
    const s = $size
    if (!s.width) return
    const first = !fitted
    fit()
    if (first) {
      zoom = homeZoom
      target.copy(home)
    }
    fitted = true
    apply()
  })

  function zoomAt(p: { x: number; y: number }, factor: number) {
    const before = groundAt(p.x, p.y)
    zoom = Math.min(maxZoom, Math.max(minZoom, zoom * factor))
    apply()
    const after = groundAt(p.x, p.y)
    target.add(before.sub(after))
    apply()
  }

  export function zoomBy(f: number) {
    zoomAt({ x: size.current.width / 2, y: size.current.height / 2 }, f)
  }

  export function fitAll() {
    fit()
    target.copy(home)
    zoom = homeZoom
    apply()
  }

  export function zoomToDistrict(id: string) {
    const p = world.districtAnchors.get(id)
    if (!p) return
    target.set(p.x, 0, p.z)
    zoom = Math.max(minZoom * 1.6, world.focusZoom * 0.85)
    apply()
  }

  onMount(() => {
    const el = dom
    const pts = new Map<number, { x: number; y: number }>()
    let down: { x: number; y: number; t: number } | null = null
    let moved = 0
    const rect = () => el.getBoundingClientRect()
    const local = (e: PointerEvent | WheelEvent) => {
      const b = rect()
      return { x: e.clientX - b.left, y: e.clientY - b.top }
    }
    const pan = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const a = groundAt(from.x, from.y)
      const b = groundAt(to.x, to.y)
      target.add(a.sub(b))
    }
    const pinch = () => {
      const [a, b] = [...pts.values()]
      return { d: Math.hypot(a.x - b.x, a.y - b.y), c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
    }
    let last: ReturnType<typeof pinch> | null = null

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      pts.set(e.pointerId, local(e))
      if (pts.size === 1) {
        down = { ...local(e), t: performance.now() }
        moved = 0
      } else down = null
      last = pts.size === 2 ? pinch() : null
    }
    const onMove = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId)
      if (!prev) return
      const p = local(e)
      pts.set(e.pointerId, p)
      if (pts.size === 1) {
        moved += Math.hypot(p.x - prev.x, p.y - prev.y)
        pan(prev, p)
        apply()
      } else if (pts.size === 2 && last) {
        const now = pinch()
        pan(last.c, now.c)
        apply()
        zoomAt(now.c, now.d / last.d)
        last = now
      }
    }
    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      last = pts.size === 2 ? pinch() : null
      if (down && moved < 8 && performance.now() - down.t < 500) pick(down.x, down.y)
      down = null
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(local(e), Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
    }
    const pick = (x: number, y: number) => {
      const { width, height } = size.current
      let best: string | null = null
      let bd = 56
      for (const [id, p] of world.anchors) {
        v.copy(p).setY(p.y * 0.5).project(camera)
        const d = Math.hypot(((v.x + 1) / 2) * width - x, ((1 - v.y) / 2) * height - y)
        if (d < bd) {
          bd = d
          best = id
        }
      }
      onpick(best)
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.style.touchAction = 'none'
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  })
</script>

<T is={camera} makeDefault manual />
<T.HemisphereLight args={dusk ? ['#b9b6ff', '#3d4a66', 1.15] : ['#fff4e0', '#5d7f6c', 1.5]} />
<T.AmbientLight args={dusk ? ['#8090c0', 0.3] : ['#c9dcff', 0.25]} />
<T is={light} />
<T is={world.root} />
