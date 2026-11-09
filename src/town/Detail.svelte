<script lang="ts">
  import { icons, uiIcons } from './icons'
  import { date, groups, plural, stateInfo } from './info'
  import type { TownNode } from './types'

  let {
    node,
    district,
    doneSince,
    onclose,
    full = $bindable(false),
  }: { node: TownNode; district: string; doneSince: string; onclose: () => void; full?: boolean } = $props()

  const SHOW = 8
  let expanded = $state<Record<string, boolean>>({})
  let snap = $state<'half' | 'full'>('half')
  let drag = $state(0)
  let start = $state<number | null>(null)
  let trail: [number, number][] = []
  $effect(() => {
    full = snap === 'full'
  })
  let el = $state<HTMLElement>()

  $effect(() => {
    void node.id
    expanded = {}
    el?.scrollTo(0, 0)
  })

  const lists = $derived(groups.map((g) => ({ ...g, items: node.items.filter(g.pick) })).filter((g) => g.items.length))
  const c = $derived(node.counts)

  function down(e: PointerEvent) {
    if (!matchMedia('(max-width: 700px)').matches) return
    start = e.clientY
    trail = [[e.timeStamp, e.clientY]]
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent) {
    if (start === null) return
    drag = e.clientY - start
    trail = [...trail.filter(([t]) => e.timeStamp - t < 100), [e.timeStamp, e.clientY]]
  }
  function up(e: PointerEvent) {
    if (start === null) return
    const [t0, y0] = trail[0]
    const [t1, y1] = trail[trail.length - 1]
    // Where the sheet would have coasted to in 150ms; a finger that stopped before lifting has no speed.
    const fling = drag + (t1 > t0 && e.timeStamp - t1 < 80 ? ((y1 - y0) / (t1 - t0)) * 150 : 0)
    if (Math.abs(drag) < 4) snap = snap === 'half' ? 'full' : 'half'
    else if (fling < -50) snap = 'full'
    else if (fling > 60) {
      if (snap === 'full') snap = 'half'
      else onclose()
    }
    start = null
    drag = 0
  }
</script>

<aside
  class="panel snap-{snap}"
  class:dragging={start !== null}
  style:translate={drag ? `0 ${Math.max(drag, snap === 'full' ? 0 : -200)}px` : null}
  aria-label={node.name}
  bind:this={el}
>
  <div class="grab" role="presentation" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
    <p class="eyebrow">{district}</p>
    <h2>{node.name}</h2>
    <button class="close" onpointerdown={(e) => e.stopPropagation()} onclick={onclose} aria-label="Close">×</button>
  </div>
  {#if node.blurb}<p class="blurb">{node.blurb}</p>{/if}
  <div class="status">
    <span class="badge big s-{node.state}">{@html icons[node.state]}{stateInfo[node.state].label}</span>
    <span class="meaning">{stateInfo[node.state].meaning}</span>
    {#if node.since || node.evidence}
      <span class="since">
        {#if node.since}{stateInfo[node.state].label} since {date(node.since)}{/if}
        {#if node.evidence}<a href={node.evidence} target="_blank" rel="noopener">{node.since ? 'Source' : 'How we know'}{@html uiIcons.external}</a>{/if}
      </span>
    {/if}
  </div>
  <ul class="counts">
    {#if c.fires}<li class="badge o-fire">{@html icons.fire}{plural(c.fires, 'data-loss / urgent bug')}</li>{/if}
    {#if c.bugs}<li class="badge o-broken">{@html icons.broken}{plural(c.bugs, 'bug')}</li>{/if}
    {#if c.active}<li class="badge o-working">{@html icons.working}{c.active} being worked on</li>{/if}
    <li class="badge o-items">{@html uiIcons.items}{plural(c.open, 'open item')}</li>
    {#if c.done}<li class="badge o-done">{@html icons.open}{c.done} done since {date(doneSince)}</li>{/if}
  </ul>

  {#each lists as g (g.id)}
    {@const more = g.items.length > SHOW && !expanded[g.id]}
    <section class="group g-{g.id}">
      <h3>{g.title} <span>{g.items.length}</span></h3>
      <ul class="items">
        {#each more ? g.items.slice(0, SHOW) : g.items as i (i.key)}
          <li>
            <a href={i.url} target="_blank" rel="noopener">
              <span class="t">{i.title}</span>
              <span class="meta">
                {#if i.isPr}<span class="pr">PR</span>{/if}
                {#if i.active && g.id !== 'work' && g.id !== 'done'}<span class="on">being worked on</span>{/if}
                <span class="ref">{i.key}</span>
              </span>
            </a>
          </li>
        {/each}
      </ul>
      {#if more}
        <button class="more" onclick={() => (expanded[g.id] = true)}>Show all {g.items.length}</button>
      {/if}
    </section>
  {:else}
    <p class="empty">Nothing open here.</p>
  {/each}
</aside>
