<script lang="ts">
  import { Canvas } from '@threlte/core'
  import { tick } from 'svelte'
  import { NeutralToneMapping, PCFShadowMap } from 'three'
  import Detail from './Detail.svelte'
  import List from './List.svelte'
  import Scene from './Scene.svelte'
  import { town as data } from './model'
  import { icons, uiIcons } from './icons'
  import { date, stateInfo, states, summary, totals, visible } from './info'
  import type { TownNode } from './types'
  import type { View, World } from './world'

  const town = visible(data)
  const REPO = 'https://github.com/sillsdev/languageforge-lexbox'
  const nodes = Object.values(town.nodes)
  const districtName = Object.fromEntries(town.districts.map((d) => [d.id, d.name]))
  const districtSize = Object.fromEntries(town.districts.map((d) => [d.id, d.nodes.length]))
  const total = totals(nodes)
  const focus = nodes.filter((n) => n.counts.fires || n.state !== 'open').map((n) => n.id)

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
    | { kind: 'district'; id: string; x: number; y: number; small: boolean }
    | { kind: 'dot'; id: string; x: number; y: number; n: TownNode }
    | { kind: 'spot'; id: string; x: number; y: number; n: TownNode; head: number; side?: 'l' | 'r'; state: boolean }
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
      // Buildings that need attention claim space before district names, which nudge aside or drop.
      const spots: Extract<Label, { kind: 'spot' }>[] = []
      const fires = onNodes.filter((p) => town.nodes[p.id].counts.fires).sort((a, b) => town.nodes[b.id].counts.fires - town.nodes[a.id].counts.fires)
      for (const p of fires) {
        const n = town.nodes[p.id]
        const head = 30 + String(n.counts.fires).length * 7
        if (fits([p.x - head / 2, p.y - 12, p.x + head / 2, p.y + 12]) || selectedId === n.id) spots.push({ kind: 'spot', id: n.id, x: p.x, y: p.y, n, head, state: false })
      }
      const name = (s: (typeof spots)[number], extra: number) => {
        const nw = s.n.name.length * 6.9 + 12 + extra
        const from = s.head / 2
        if (s.x + from + nw < w - 4 && fits([s.x + from, s.y - 12, s.x + from + nw, s.y + 12])) s.side = 'r'
        else if (s.x - from - nw > 4 && fits([s.x - from - nw, s.y - 12, s.x - from, s.y + 12])) s.side = 'l'
        return !!s.side
      }
      for (const s of spots) {
        const sw = s.n.state === 'open' ? 0 : stateInfo[s.n.state].label.length * 6.2 + 26
        if (sw && name(s, sw)) s.state = true
        else name(s, 0)
      }
      for (const p of onNodes) {
        const n = town.nodes[p.id]
        if (n.counts.fires || n.state === 'open') continue
        const head = stateInfo[n.state].label.length * 6.2 + 30
        const nw = n.name.length * 6.9 + 12
        const [l, r] = [p.x - head / 2, p.x + head / 2]
        // A state with no name beside it is a guessing game, so it's both or neither.
        for (const y of [p.y, p.y - 26, p.y + 26]) {
          const side = l > 4 && r + nw < w - 4 && fits([l, y - 12, r + nw, y + 12]) ? 'r' : r < w - 4 && l - nw > 4 && fits([l - nw, y - 12, r, y + 12]) ? 'l' : undefined
          if (!side) continue
          spots.push({ kind: 'spot', id: n.id, x: p.x, y, n, head, side, state: true })
          break
        }
      }
      const ds = view.points
        .filter((p) => p.on && p.id.startsWith('d:'))
        .sort((a, b) => (districtSize[b.id.slice(2)] ?? 0) - (districtSize[a.id.slice(2)] ?? 0))
      for (const p of ds) {
        const id = p.id.slice(2)
        const len = (districtName[id] ?? id).length
        for (const [bw, bh] of [[len * (w < 700 ? 7.7 : 8.6) + 30, 17], [len * 6.7 + 22, 12]]) {
          const offsets = [[0, 0], [0, -30], [0, 30], [bw / 3, -24], [-bw / 3, -24], [bw / 3, 24], [-bw / 3, 24], [bw / 2, 0], [-bw / 2, 0], [0, -52], [0, 52], [bw / 2, -24], [-bw / 2, -24], [bw / 2, 24], [-bw / 2, 24]]
          const at = offsets.find(([dx, dy]) => p.x + dx - bw / 2 > 4 && p.x + dx + bw / 2 < w - 4 && fits([p.x + dx - bw / 2, p.y + dy - bh, p.x + dx + bw / 2, p.y + dy + bh]))
          if (!at) continue
          out.push({ kind: 'district', id, x: p.x + at[0], y: p.y + at[1], small: bh < 17 })
          break
        }
      }
      for (const p of onNodes) if (selectedId === p.id && !spots.some((s) => s.id === p.id)) out.push({ kind: 'dot', id: p.id, x: p.x, y: p.y, n: town.nodes[p.id] })
      return [...out, ...spots]
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
      const bw = Math.max(n.name.length * 7.3 + (n.state === 'open' ? 17 : 0), badgeWidth(n)) + 18
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

  function insets() {
    const top = document.querySelector('.title')?.getBoundingClientRect().bottom ?? 0
    const key = document.querySelector('.legend')?.getBoundingClientRect().top
    return { top, bottom: key ? innerHeight - key : 0 }
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
        <Scene bind:this={scene} {world} onview={(v) => (view = v)} onpick={pick} {focus} {insets} />
      </Canvas>
    {:else}
      <p class="loading">{error || 'Building the town…'}</p>
    {/if}
  </div>

  {#if !listOpen}
    <div class="labels">
      {#each labels as l (l.kind + l.id)}
        {#if l.kind === 'district'}
          <button class="district" class:small={l.small} style="transform: translate({l.x}px, {l.y}px)" onclick={() => zoomDistrict(l.id)}>
            {districtName[l.id] ?? l.id}
          </button>
        {:else if l.kind === 'dot'}
          {@const n = l.n}
          <button class="dot active" style="transform: translate({l.x}px, {l.y}px)" onclick={() => pick(n.id)} aria-label={n.name}></button>
        {:else if l.kind === 'spot'}
          {@const n = l.n}
          <button
            class="spot {l.side ?? ''}"
            class:active={selectedId === n.id}
            style="transform: translate({l.x}px, {l.y}px); --head: {l.head}px"
            onclick={() => pick(n.id)}
            aria-label="{n.name}: {stateInfo[n.state].label}{n.counts.fires ? `, ${n.counts.fires} data-loss or urgent bugs` : ''}"
          >
            <span class="head">
              {#if n.counts.fires}
                <span class="badge o-fire">{@html icons.fire}{n.counts.fires}</span>
              {:else}
                <span class="badge s-{n.state}">{@html icons[n.state]}{stateInfo[n.state].label}</span>
              {/if}
            </span>
            {#if l.side}
              <span class="name">{n.name}</span>
              {#if n.counts.fires && l.state}<span class="badge s-{n.state}">{@html icons[n.state]}{stateInfo[n.state].label}</span>{/if}
            {/if}
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
              <span class="name">{#if n.state === 'open'}<span class="ok" title={stateInfo.open.label}>{@html icons.open}</span>{/if}{n.name}</span>
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
        <li class="lead">{nodes.length - (town.nodes.unsorted ? 1 : 0)} features</li>
        {#each [...states].reverse() as s}
          <li class="badge s-{s}">{@html icons[s]}<b>{total.states[s]}</b>{stateInfo[s].label}</li>
        {/each}
        <li class="lead">Open work</li>
        <li class="badge o-fire">{@html icons.fire}<b>{total.fires}</b><span class="long">Data-loss / urgent bugs</span><span class="short">Urgent bugs</span></li>
        <li class="badge o-broken more">{@html icons.broken}<b>{total.bugs}</b>Bugs</li>
        <li class="badge o-working more">{@html icons.working}<b>{total.active}</b>Being worked on</li>
        <li class="badge o-items more">{@html uiIcons.items}<b>{total.open}</b>Open items</li>
      </ul>
    </div>
  {/if}

  {#if selected}
    <Detail node={selected} district={districtName[selected.district] ?? selected.district} doneSince={town.doneSince} onclose={close} bind:full={sheetFull} />
  {/if}
</main>
