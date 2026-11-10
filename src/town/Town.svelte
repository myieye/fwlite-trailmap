<script lang="ts">
  import { Canvas } from '@threlte/core'
  import { tick } from 'svelte'
  import { NeutralToneMapping, PCFShadowMap } from 'three'
  import Detail from './Detail.svelte'
  import List from './List.svelte'
  import Scene from './Scene.svelte'
  import { town as data } from './model'
  import { icons, uiIcons } from './icons'
  import { swatch } from './districts'
  import { date, plural, stateInfo, states, summary, totals, visible } from './info'
  import type { TownNode } from './types'
  import type { View, World } from './world'

  const town = visible(data)
  const REPO = 'https://github.com/sillsdev/languageforge-lexbox'
  const nodes = Object.values(town.nodes)
  const districtName = Object.fromEntries(town.districts.map((d) => [d.id, d.name]))
  const rollup = Object.fromEntries(
    town.districts.map((d) => {
      const own = d.nodes.map((id) => town.nodes[id])
      return [d.id, { features: own.length, fires: totals(own).fires }]
    }),
  )
  const districtCount = town.districts.filter((d) => d.nodes.length && d.id !== 'unsorted').length
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
    | { kind: 'mark'; id: string; x: number; y: number; n: TownNode; head: number; side: 'l' | 'r' }
    | { kind: 'tag'; id: string; x: number; y: number; dx: number; n: TownNode }

  /** Far view: districts by name, buildings only as fire and state marks. Near view: every building by name. */
  const labels = $derived.by(() => {
    const boxes: Box[] = chrome()
    const clear = (r: Box) => !boxes.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1])
    const fits = (r: Box) => clear(r) && !!boxes.push(r)
    const onNodes = view.points.filter((p) => p.on && town.nodes[p.id])
    const mark = (p: (typeof onNodes)[number]): Extract<Label, { kind: 'mark' }> => {
      const n = town.nodes[p.id]
      const head = n.counts.fires ? 30 + String(n.counts.fires).length * 7 : n.state === 'open' ? 12 : 22
      return { kind: 'mark', id: n.id, x: p.x, y: p.y, n, head, side: p.x > w - 190 ? 'l' : 'r' }
    }
    const marks: Label[] = []
    const tags: Label[] = []
    if (near) {
      const cap = w < 640 ? 9 : 18
      const score = (p: (typeof onNodes)[number]) => {
        const n = town.nodes[p.id]
        if (selectedId === n.id) return -1e9
        return Math.hypot(p.x - w / 2, p.y - h / 2) - (n.counts.fires ? 150 : 0)
      }
      for (const p of onNodes.sort((a, b) => score(a) - score(b))) {
        const n = town.nodes[p.id]
        const bw = Math.max(n.name.length * 7.3 + (n.state === 'open' ? 17 : 0), badgeWidth(n)) + 18
        const x = Math.min(Math.max(p.x, bw / 2 + 6), w - bw / 2 - 6)
        if (tags.length < cap && fits([x - bw / 2, p.y - 58, x + bw / 2, p.y - 6])) tags.push({ kind: 'tag', id: n.id, x: p.x, y: p.y, dx: x - p.x, n })
        else marks.push(mark(p))
      }
    } else {
      for (const p of onNodes) {
        const n = town.nodes[p.id]
        if (!n.counts.fires && n.state === 'open' && selectedId !== n.id) continue
        const m = mark(p)
        boxes.push([p.x - m.head / 2 - 4, p.y - 14, p.x + m.head / 2 + 4, p.y + 14])
        marks.push(m)
      }
    }
    const districts: Label[] = []
    for (const p of view.points.filter((p) => p.on && p.id.startsWith('d:'))) {
      const id = p.id.slice(2)
      const len = (districtName[id] ?? id).length
      const full: [number, number] = [Math.max(len * (w < 700 ? 8.6 : 9.6), 100) / 2 + 6, 24]
      const small: [number, number] = [(len * 7.4) / 2 + 4, 11]
      const place = ([bw, bh]: [number, number], reach: number) => {
        const steps = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5]
        const offsets = steps
          .flatMap((i) => steps.map((j) => [(i * bw) / 2, j * bh]))
          .filter(([dx, dy]) => Math.hypot(dx, dy) < reach)
          .sort((a, b) => Math.hypot(...a) - Math.hypot(...b))
        return offsets.find(([dx, dy]) => p.x + dx - bw > 4 && p.x + dx + bw < w - 4 && fits([p.x + dx - bw, p.y + dy - bh, p.x + dx + bw, p.y + dy + bh]))
      }
      // Near view names the district in the crumb, so a name that doesn't fit there is dropped. Far view always shows all of them.
      const at = near ? undefined : place(full, 130)
      const fallback = at ? undefined : place(small, near ? 60 : 220)
      if (at) districts.push({ kind: 'district', id, x: p.x + at[0], y: p.y + at[1], small: false })
      else if (fallback) districts.push({ kind: 'district', id, x: p.x + fallback[0], y: p.y + fallback[1], small: true })
      else if (!near) districts.push({ kind: 'district', id, x: Math.min(Math.max(p.x, small[0] + 4), w - small[0] - 4), y: p.y, small: true })
    }
    return [...districts, ...marks, ...tags]
  })

  function badgeWidth(n: TownNode) {
    const num = (k: number) => (k ? 26 + String(k).length * 7 : 0)
    return (n.state === 'open' ? 0 : stateInfo[n.state].label.length * 6.2 + 26) + num(n.counts.fires) + num(n.counts.bugs) + num(n.counts.active) + num(n.counts.open)
  }

  function chrome(): Box[] {
    void selectedId
    void legendOpen
    void near
    return [...document.querySelectorAll('.title, .crumb, .legend, .controls, .panel')].map((el) => {
      const r = el.getBoundingClientRect()
      return [r.left - 4, r.top - 4, r.right + 4, r.bottom + 4]
    })
  }

  function insets() {
    const top = document.querySelector('.top')?.getBoundingClientRect().bottom ?? 0
    const key = document.querySelector('.legend')?.getBoundingClientRect().top
    return { top, bottom: key ? innerHeight - key : 0 }
  }

  /** Middle of the map that the panel or sheet leaves uncovered. */
  function centre() {
    const panel = document.querySelector('.panel')?.getBoundingClientRect()
    if (!panel) return { x: w / 2, y: h / 2 }
    return w <= 700 ? { x: w / 2, y: panel.top / 2 } : { x: panel.left / 2, y: h / 2 }
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
        <Scene bind:this={scene} {world} onview={(v) => (view = v)} onpick={pick} {focus} {insets} {centre} />
      </Canvas>
    {:else}
      <p class="loading">{error || 'Building the town…'}</p>
    {/if}
  </div>

  {#if !listOpen}
    <div class="labels">
      {#each labels as l (l.kind + l.id)}
        {#if l.kind === 'district'}
          {@const r = rollup[l.id]}
          <button
            class="district"
            class:small={l.small}
            style="transform: translate({l.x}px, {l.y}px); {swatch(l.id)}"
            onclick={() => zoomDistrict(l.id)}
            aria-label="{districtName[l.id]} district, {plural(r.features, 'feature')}{r.fires ? `, ${r.fires} data-loss or urgent bugs` : ''}. Zoom in."
          >
            <span class="dname">{districtName[l.id] ?? l.id}</span>
            {#if !l.small}
              <span class="dsub"><i class="swatch"></i>{plural(r.features, 'feature')}{#if r.fires}<span class="badge o-fire">{@html icons.fire}{r.fires}</span>{/if}</span>
            {/if}
          </button>
        {:else if l.kind === 'mark'}
          {@const n = l.n}
          <button
            class="spot {l.side}"
            class:active={selectedId === n.id}
            class:plain={!n.counts.fires && n.state === 'open'}
            style="transform: translate({l.x}px, {l.y}px); --head: {l.head}px"
            onclick={() => pick(n.id)}
            aria-label="{n.name}: {stateInfo[n.state].label}{n.counts.fires ? `, ${n.counts.fires} data-loss or urgent bugs` : ''}"
          >
            <span class="head">
              {#if n.counts.fires}
                <span class="badge o-fire">{@html icons.fire}{n.counts.fires}</span>
              {:else if n.state !== 'open'}
                <span class="badge round s-{n.state}">{@html icons[n.state]}</span>
              {/if}
            </span>
            <span class="name">{n.name}</span>
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

  <div class="top">
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

    {#if !listOpen && world}
      {@const here = near ? view.district : undefined}
      <nav class="crumb" aria-label="Map location">
        <ol>
          {#if near}
            <li><button onclick={() => (setHash(''), scene?.fitAll())}>‹ Whole town</button></li>
            {#if here}
              <li aria-current="location" style={swatch(here)}>
                <i class="swatch"></i>{districtName[here]}
                {#if rollup[here].fires}<span class="badge o-fire" title="Data-loss / urgent bugs">{@html icons.fire}{rollup[here].fires}</span>{/if}
              </li>
            {/if}
          {:else}
            <li aria-current="location">Whole town</li>
            <li class="hint">{districtCount} districts · pick one to zoom in</li>
          {/if}
        </ol>
      </nav>
    {/if}
  </div>

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
    <Detail node={selected} district={districtName[selected.district] ?? selected.district} districtId={selected.district} doneSince={town.doneSince} onclose={close} bind:full={sheetFull} />
  {/if}
</main>
