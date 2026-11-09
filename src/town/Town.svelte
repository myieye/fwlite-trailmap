<script lang="ts">
  import { Canvas } from '@threlte/core'
  import { tick } from 'svelte'
  import { NeutralToneMapping, PCFShadowMap } from 'three'
  import Scene from './Scene.svelte'
  import { buildings, districts, stateInfo, type Building, type DistrictId, type State } from './data'
  import { icons } from './icons'
  import type { View, World } from './world'

  const variant = new URLSearchParams(location.search).get('v') === 'modern' ? 'modern' : 'hex'
  let world = $state.raw<World>()
  let error = $state('')
  const load = variant === 'modern' ? import('./modern').then((m) => m.buildModern()) : import('./hex').then((m) => m.buildHex())
  load.then((w) => (world = w)).catch((e) => (error = String(e)))

  let view = $state.raw<View>({ zoom: 1, minZoom: 1, points: [] })
  let selected = $state<Building | null>(null)
  let focus = $state<{ id: string; n: number }>()
  let scene = $state<Scene>()
  let w = $state(0)
  let h = $state(0)

  const near = $derived(!!world && view.zoom > world.nearZoom)
  const byId = Object.fromEntries(buildings.map((b) => [b.id, b]))

  type Placed = { id: string; x: number; y: number; b?: Building; district?: DistrictId }
  const labels = $derived.by(() => {
    const cap = w < 640 ? 7 : 13
    const out: Placed[] = []
    const boxes: [number, number, number, number][] = chrome()
    const fits = (x: number, y: number, bw: number, bh: number) => {
      const r: [number, number, number, number] = [x - bw / 2, y - bh, x + bw / 2, y]
      if (boxes.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1])) return false
      boxes.push(r)
      return true
    }
    if (!near) {
      for (const p of view.points)
        if (p.on && p.id.startsWith('d:')) out.push({ id: p.id, x: p.x, y: p.y, district: p.id.slice(2) as DistrictId })
      return out
    }
    const pts = view.points
      .filter((p) => p.on && byId[p.id])
      .sort((a, b) => {
        const s = (p: typeof a) => (selected?.id === p.id ? -1e9 : Math.hypot(p.x - w / 2, p.y - h / 2))
        return s(a) - s(b)
      })
    for (const p of pts) {
      if (out.length >= cap) break
      const b = byId[p.id]
      const bw = Math.max(b.name.length * 7.4 + 24, 96)
      const x = Math.min(Math.max(p.x, bw / 2 + 6), w - bw / 2 - 6)
      const y = Math.max(p.y, 64)
      if (fits(x, y, bw, 52)) out.push({ id: p.id, x, y, b })
    }
    return out
  })

  function chrome() {
    void selected
    return [...document.querySelectorAll('.title, .legend, .zoom, .panel')].map((el) => {
      const r = el.getBoundingClientRect()
      return [r.left - 4, r.top - 4, r.right + 4, r.bottom + 4] as [number, number, number, number]
    })
  }

  const chipStates: State[] = ['planned', 'building', 'beta', 'open']

  async function pick(id: string | null) {
    selected = id && byId[id] ? byId[id] : null
    await tick()
    if (selected) scene?.reveal(selected.id)
  }
  function zoomDistrict(id: DistrictId) {
    focus = { id, n: Math.random() }
  }
  function zoomBy(f: number) {
    scene?.zoomBy(f)
  }
</script>

<svelte:window bind:innerWidth={w} bind:innerHeight={h} onkeydown={(e) => e.key === 'Escape' && (selected = null)} />

<main class:sheet-open={!!selected}>
  <div class="stage">
    {#if world}
      <Canvas renderMode="on-demand" dpr={[1, 2]} toneMapping={NeutralToneMapping} shadows={PCFShadowMap}>
        <Scene bind:this={scene} {world} onview={(v) => (view = v)} onpick={pick} {focus} />
      </Canvas>
    {:else}
      <p class="loading">{error || 'Building the town…'}</p>
    {/if}
  </div>

  <div class="labels" aria-label="Map labels">
    {#each labels as l (l.id)}
      {#if l.district}
        <button class="district" style="transform: translate({l.x}px, {l.y}px)" onclick={() => zoomDistrict(l.district!)}>
          {districts[l.district].name}
        </button>
      {:else if l.b}
        {@const b = l.b}
        <button
          class="tag"
          class:active={selected?.id === b.id}
          style="transform: translate({l.x}px, {l.y}px)"
          onclick={() => pick(b.id)}
          aria-label="{b.name}: {stateInfo[b.state].label}"
        >
          <span class="name">{b.name}</span>
          <span class="badges">
            <span class="badge s-{b.state}">{@html icons[b.state]}{stateInfo[b.state].label}</span>
            {#if b.fire}<span class="badge o-fire" title="Urgent data bugs">{@html icons.fire}{b.fire}</span>{/if}
            {#if b.broken}<span class="badge o-broken" title="Open bugs">{@html icons.broken}{b.broken}</span>{/if}
            {#if b.working}<span class="badge o-working" title="Being improved">{@html icons.working}</span>{/if}
          </span>
        </button>
      {/if}
    {/each}
  </div>

  <header class="title">
    <p class="eyebrow">FieldWorks Lite</p>
    <h1>The town</h1>
    <p class="sub">Each building is a feature. Prototype, made-up status.</p>
    <nav class="variants" aria-label="Style">
      <a href="?v=hex" class:on={variant === 'hex'}>Village</a>
      <a href="?v=modern" class:on={variant === 'modern'}>Modern</a>
    </nav>
  </header>

  <div class="zoom" role="group" aria-label="Zoom">
    <button onclick={() => zoomBy(1.5)} aria-label="Zoom in">+</button>
    <button onclick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">−</button>
  </div>

  <ul class="legend" aria-label="Legend">
    {#each chipStates as s}
      <li class="badge s-{s}">{@html icons[s]}{stateInfo[s].label}</li>
    {/each}
    <li class="badge o-broken">{@html icons.broken}Bugs</li>
    <li class="badge o-fire">{@html icons.fire}Urgent</li>
    <li class="badge o-working">{@html icons.working}Improving</li>
  </ul>

  {#if selected}
    {@const b = selected}
    <aside class="panel" aria-label={b.name}>
      <button class="close" onclick={() => (selected = null)} aria-label="Close">×</button>
      <p class="eyebrow">{districts[b.district].name}</p>
      <h2>{b.name}</h2>
      <p class="blurb">{b.blurb}</p>
      <div class="status">
        <span class="badge big s-{b.state}">{@html icons[b.state]}{stateInfo[b.state].label}</span>
        <span class="meaning">{stateInfo[b.state].meaning}</span>
      </div>
      {#if b.fire || b.broken || b.working}
        <div class="overlays">
          {#if b.fire}<span class="badge o-fire">{@html icons.fire}{b.fire} urgent data bugs</span>{/if}
          {#if b.broken}<span class="badge o-broken">{@html icons.broken}{b.broken} open {b.broken === 1 ? 'bug' : 'bugs'}</span>{/if}
          {#if b.working}<span class="badge o-working">{@html icons.working}Being improved</span>{/if}
        </div>
      {/if}
      <h3>What’s going on</h3>
      <ul class="issues">
        {#each b.issues as i}<li>{i}</li>{/each}
      </ul>
    </aside>
  {/if}
</main>
