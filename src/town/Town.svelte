<script lang="ts">
  import { Canvas } from '@threlte/core'
  import { tick } from 'svelte'
  import { NeutralToneMapping, PCFShadowMap } from 'three'
  import Detail from './Detail.svelte'
  import List from './List.svelte'
  import Scene from './Scene.svelte'
  import { town as data } from './model'
  import { icons, uiIcons } from './icons'
  import { date, stateInfo, states, summary, visible } from './info'
  import type { TownNode } from './types'
  import type { View, World } from './world'

  const town = visible(data)
  const REPO = 'https://github.com/sillsdev/languageforge-lexbox'
  const nodes = Object.values(town.nodes)
  const districtName = Object.fromEntries(town.districts.map((d) => [d.id, d.name]))
  const districtSize = Object.fromEntries(town.districts.map((d) => [d.id, d.nodes.length]))

  let world = $state.raw<World>()
  let error = $state('')
  import('./hex')
    .then((m) => m.buildHex(town))
    .then((w) => (world = w))
    .catch((e) => (error = String(e)))

  let view = $state.raw<View>({ zoom: 1, minZoom: 1, points: [] })
  let selectedId = $state<string | null>(null)
  const selected = $derived(selectedId ? (town.nodes[selectedId] ?? null) : null)
  let listOpen = $state(false)
  let legendOpen = $state(false)
  let sheetFull = $state(false)
  let scene = $state<Scene>()
  let w = $state(0)
  let h = $state(0)
  let pending: { node?: string; district?: string } | null = readHash()

  const near = $derived(!!world && view.zoom > world.nearZoom)

  type Box = [number, number, number, number]
  type Label =
    | { kind: 'district'; id: string; x: number; y: number }
    | { kind: 'dot'; id: string; x: number; y: number; n: TownNode }
    | { kind: 'tag'; id: string; x: number; y: number; dx: number; n: TownNode }

  const labels = $derived.by(() => {
    const out: Label[] = []
    const boxes: Box[] = chrome()
    const fits = (r: Box) => {
      if (boxes.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1])) return false
      boxes.push(r)
      return true
    }
    const onNodes = view.points.filter((p) => p.on && town.nodes[p.id])
    if (!near) {
      const dot = (n: TownNode, x: number, y: number) => {
        const r = n.counts.fires ? 16 : 8
        return fits([x - r, y - 11, x + r, y + 11]) || selectedId === n.id
      }
      const fires = onNodes.filter((p) => town.nodes[p.id].counts.fires)
      for (const p of fires) if (dot(town.nodes[p.id], p.x, p.y)) out.push({ kind: 'dot', id: p.id, x: p.x, y: p.y, n: town.nodes[p.id] })
      const ds = view.points
        .filter((p) => p.on && p.id.startsWith('d:'))
        .sort((a, b) => (districtSize[b.id.slice(2)] ?? 0) - (districtSize[a.id.slice(2)] ?? 0))
      for (const p of ds) {
        const id = p.id.slice(2)
        const bw = (districtName[id] ?? id).length * 8.6 + 30
        const spots = [[0, 0], [0, -30], [0, 30], [bw / 3, -24], [-bw / 3, -24], [bw / 3, 24], [-bw / 3, 24]]
        const at = spots.find(([dx, dy]) => fits([p.x + dx - bw / 2, p.y + dy - 17, p.x + dx + bw / 2, p.y + dy + 17]))
        if (at) out.push({ kind: 'district', id, x: p.x + at[0], y: p.y + at[1] })
      }
      for (const p of onNodes) {
        const n = town.nodes[p.id]
        if (!n.counts.fires && (n.counts.bugs || selectedId === n.id) && dot(n, p.x, p.y)) out.push({ kind: 'dot', id: n.id, x: p.x, y: p.y, n })
      }
      return out
    }
    const cap = w < 640 ? 9 : 18
    const score = (p: (typeof onNodes)[number]) => {
      const n = town.nodes[p.id]
      if (selectedId === n.id) return -1e9
      return Math.hypot(p.x - w / 2, p.y - h / 2) - (n.counts.fires ? 150 : 0)
    }
    for (const p of onNodes.sort((a, b) => score(a) - score(b))) {
      if (out.length >= cap) break
      const n = town.nodes[p.id]
      const bw = Math.max(n.name.length * 7.3, badgeWidth(n)) + 18
      const x = Math.min(Math.max(p.x, bw / 2 + 6), w - bw / 2 - 6)
      if (fits([x - bw / 2, p.y - 58, x + bw / 2, p.y - 6])) out.push({ kind: 'tag', id: n.id, x: p.x, y: p.y, dx: x - p.x, n })
    }
    return out
  })

  function badgeWidth(n: TownNode) {
    const num = (k: number) => (k ? 26 + String(k).length * 7 : 0)
    return (n.state === 'open' ? 0 : stateInfo[n.state].label.length * 6.2 + 26) + num(n.counts.fires) + num(n.counts.bugs) + num(n.counts.active) + num(n.counts.open)
  }

  function chrome(): Box[] {
    void selectedId
    void legendOpen
    return [...document.querySelectorAll('.title, .legend, .controls, .panel')].map((el) => {
      const r = el.getBoundingClientRect()
      return [r.left - 4, r.top - 4, r.right + 4, r.bottom + 4]
    })
  }

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1))
    const node = p.get('node') ?? undefined
    const district = p.get('district') ?? undefined
    return node || district ? { node, district } : null
  }
  function setHash(h: string) {
    history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search)
  }

  async function apply(p: { node?: string; district?: string } | null, fromHash = false) {
    if (p?.node && town.nodes[p.node]) {
      selectedId = p.node
      await tick()
      scene?.reveal(p.node, fromHash)
    } else if (p?.district) {
      selectedId = null
      scene?.zoomToDistrict(p.district)
    } else selectedId = null
  }

  $effect(() => {
    if (pending && scene && view.points.length) {
      const p = pending
      pending = null
      apply(p, true)
    }
  })

  async function pick(id: string | null) {
    if (id && !town.nodes[id]) id = null
    selectedId = id
    setHash(id ? `node=${id}` : '')
    await tick()
    if (id && !listOpen) scene?.reveal(id)
  }
  function zoomDistrict(id: string) {
    setHash(`district=${id}`)
    scene?.zoomToDistrict(id)
  }
  function close() {
    selectedId = null
    setHash('')
  }
</script>

<svelte:window
  bind:innerWidth={w}
  bind:innerHeight={h}
  onkeydown={(e) => e.key === 'Escape' && close()}
  onhashchange={() => apply(readHash(), true)}
/>

<main class:sheet-open={!!selected} class:sheet-full={!!selected && sheetFull} class:list-open={listOpen}>
  <div class="stage" role="img" aria-label="Map of {town.districts.filter((d) => d.nodes.length).length} districts and {summary(nodes)} Use the list view to read it as text.">
    {#if world}
      <Canvas renderMode="on-demand" dpr={[1, 2]} toneMapping={NeutralToneMapping} shadows={PCFShadowMap}>
        <Scene bind:this={scene} {world} onview={(v) => (view = v)} onpick={pick} />
      </Canvas>
    {:else}
      <p class="loading">{error || 'Building the town…'}</p>
    {/if}
  </div>

  {#if !listOpen}
    <div class="labels">
      {#each labels as l (l.kind + l.id)}
        {#if l.kind === 'district'}
          <button class="district" style="transform: translate({l.x}px, {l.y}px)" onclick={() => zoomDistrict(l.id)}>
            {districtName[l.id] ?? l.id}
          </button>
        {:else if l.kind === 'dot'}
          {@const n = l.n}
          <button
            class="dot"
            class:fire={n.counts.fires > 0}
            class:active={selectedId === n.id}
            style="transform: translate({l.x}px, {l.y}px)"
            onclick={() => pick(n.id)}
            aria-label="{n.name}: {n.counts.fires ? `${n.counts.fires} urgent` : `${n.counts.bugs} bugs`}"
          >
            {#if n.counts.fires}{@html icons.fire}{n.counts.fires}{/if}
          </button>
        {:else}
          {@const n = l.n}
          <div class="pin" style="transform: translate({l.x}px, {l.y}px)">
            <button
              class="tag"
              class:active={selectedId === n.id}
              style="--dx: {l.dx}px"
              onclick={() => pick(n.id)}
              aria-label="{n.name}: {stateInfo[n.state].label}"
            >
              <span class="name">{n.name}</span>
              <span class="badges">
                {#if n.state !== 'open'}<span class="badge s-{n.state}">{@html icons[n.state]}{stateInfo[n.state].label}</span>{/if}
                {#if n.counts.fires}<span class="badge o-fire" title="Data-loss / urgent bugs">{@html icons.fire}{n.counts.fires}</span>{/if}
                {#if n.counts.bugs}<span class="badge o-broken" title="Bugs">{@html icons.broken}{n.counts.bugs}</span>{/if}
                {#if n.counts.active}<span class="badge o-working" title="Being worked on">{@html icons.working}{n.counts.active}</span>{/if}
                {#if n.counts.open}<span class="badge o-items" title="Open items">{@html uiIcons.items}{n.counts.open}</span>{/if}
              </span>
            </button>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if listOpen}
    <List {town} selected={selectedId} onpick={pick} />
  {/if}

  <header class="title">
    <div>
      <h1>FieldWorks Lite</h1>
      <p class="sub">
        Updated {date(town.generatedAt)} · <a href={REPO} target="_blank" rel="noopener">GitHub{@html uiIcons.external}</a>
      </p>
    </div>
    <button class="toggle" onclick={() => (listOpen = !listOpen)} aria-label={listOpen ? 'Show the map' : 'Show as a list'}>
      {@html listOpen ? uiIcons.map : uiIcons.list}{listOpen ? 'Map' : 'List'}
    </button>
  </header>

  {#if !listOpen}
    <div class="controls" role="group" aria-label="Zoom">
      <button onclick={() => scene?.zoomBy(1.5)} aria-label="Zoom in">+</button>
      <button onclick={() => scene?.zoomBy(1 / 1.5)} aria-label="Zoom out">−</button>
      <button onclick={() => (setHash(''), scene?.fitAll())} aria-label="Show the whole map">{@html uiIcons.fit}</button>
    </div>

    <div class="legend" class:open={legendOpen}>
      <button class="key" onclick={() => (legendOpen = !legendOpen)} aria-expanded={legendOpen}>Key</button>
      <ul aria-label="Key">
        {#each states as s}
          <li class="badge s-{s}">{@html icons[s]}{stateInfo[s].label}</li>
        {/each}
        <li class="badge o-fire">{@html icons.fire}Data-loss / urgent bugs</li>
        <li class="badge o-broken">{@html icons.broken}Bugs</li>
        <li class="badge o-working">{@html icons.working}Being worked on</li>
        <li class="badge o-items">{@html uiIcons.items}Open items</li>
      </ul>
    </div>
  {/if}

  {#if selected}
    <Detail node={selected} district={districtName[selected.district] ?? selected.district} doneSince={town.doneSince} onclose={close} bind:full={sheetFull} />
  {/if}
</main>
