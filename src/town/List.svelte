<script lang="ts">
  import { icons, uiIcons } from './icons'
  import { stateInfo } from './info'
  import type { Town } from './types'

  let { town, selected, onpick }: { town: Town; selected: string | null; onpick: (id: string) => void } = $props()

  const listed = $derived(new Set(town.districts.flatMap((d) => d.nodes)))
  const districts = $derived([
    ...town.districts.map((d) => ({ ...d, nodes: d.nodes.filter((id) => town.nodes[id]) })),
    { id: 'other', name: 'Other', blurb: '', nodes: Object.keys(town.nodes).filter((id) => !listed.has(id)) },
  ].filter((d) => d.nodes.length))
</script>

<div class="list" role="region" aria-label="Features as a list">
  {#each districts as d (d.id)}
    <section>
      <h2>{d.name}</h2>
      {#if d.blurb}<p class="blurb">{d.blurb}</p>{/if}
      <ul>
        {#each d.nodes as id (id)}
          {@const n = town.nodes[id]}
          <li>
            <button class:active={selected === id} onclick={() => onpick(id)}>
              <span class="name">{n.name}</span>
              <span class="badges">
                <span class="badge s-{n.state}">{@html icons[n.state]}{stateInfo[n.state].label}</span>
                {#if n.counts.fires}<span class="badge o-fire" title="Data-loss / urgent bugs">{@html icons.fire}{n.counts.fires}</span>{/if}
                {#if n.counts.bugs}<span class="badge o-broken" title="Bugs">{@html icons.broken}{n.counts.bugs}</span>{/if}
                {#if n.counts.active}<span class="badge o-working" title="Being worked on">{@html icons.working}{n.counts.active}</span>{/if}
                {#if n.counts.open}<span class="badge o-items" title="Open items">{@html uiIcons.items}{n.counts.open}</span>{/if}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>
