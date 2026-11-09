<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { onMount, untrack } from 'svelte'
  import type { Projected, View, World } from './world'

  let {
    world: worldProp,
    onview,
    onpick,
    focus,
  }: {
    world: World
    onview: (v: View) => void
    onpick: (id: string | null) => void
    focus?: { id: string; n: number }
  } = $props()

  const world = untrack(() => worldProp)
  const { renderer, invalidate, dom, size } = useThrelte()
  const AZ = (38 * Math.PI) / 180
  const EL = (34 * Math.PI) / 180
  const dir = new THREE.Vector3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL))

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)
  const target = new THREE.Vector3(world.bounds.cx, 0, world.bounds.cz)
  let zoom = 30
  let minZoom = 10
  let maxZoom = 160

  const light = new THREE.DirectionalLight('#ffe7c2', 2.6)
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
    const all = [...world.anchors, ...Object.entries(world.districtAnchors).map(([k, p]) => [`d:${k}`, p] as const)]
    for (const [id, p] of all) {
      v.copy(p).project(camera)
      const x = ((v.x + 1) / 2) * width
      const y = ((1 - v.y) / 2) * height
      points.push({ id, x, y, on: x > -40 && x < width + 40 && y > -40 && y < height + 40 })
    }
    fireOn = !reduced && world.animated.some((a) => {
      v.copy(a.pos).project(camera)
      return Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2
    })
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
    const portrait = height > width
    minZoom = Math.min((width * (portrait ? 1.02 : 0.9)) / (ext.max.x - ext.min.x), (height * 0.86) / (ext.max.y - ext.min.y))
    maxZoom = Math.max(minZoom * 6, 140)
    const c = new THREE.Vector3((ext.min.x + ext.max.x) / 2, (ext.min.y + ext.max.y) / 2, 0).applyMatrix4(camera.matrixWorld)
    home.copy(c).addScaledVector(dir, -c.y / dir.y)
  }

  const home = new THREE.Vector3()

  export function reveal(id: string) {
    const p = world.anchors.get(id)
    if (!p) return
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
  let t = 0
  useTask(
    (delta) => {
      t += delta
      for (const a of world.animated) a.tick(t)
    },
    { running: () => fireOn },
  )

  let fitted = false
  $effect(() => {
    const s = $size
    if (!s.width) return
    const wasMin = !fitted
    fit()
    if (!fitted) target.copy(home)
    if (wasMin) zoom = s.height > s.width ? minZoom * 1.55 : minZoom
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

  export function zoomTo(id: string | null, z?: number) {
    const p = id ? (world.anchors.get(id) ?? world.districtAnchors[id as keyof World['districtAnchors']]) : null
    if (p) target.set(p.x, 0, p.z)
    else target.copy(home)
    zoom = z ?? minZoom
    apply()
  }

  $effect(() => {
    if (focus) zoomTo(focus.id, Math.max(minZoom * 1.6, world.focusZoom))
  })

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
<T.HemisphereLight args={['#fff4e0', '#5d7f6c', 1.5]} />
<T.AmbientLight args={['#c9dcff', 0.25]} />
<T is={light} />
<T is={world.root} />
