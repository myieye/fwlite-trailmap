<script lang="ts">
  import { areaOf, areas, plainTitle, shipped, type AreaId } from './model'

  const ids = Object.keys(areas) as AreaId[]
  const groups = ids
    .map((id) => ({ id, ...areas[id], list: shipped.filter((i) => areaOf(i) === id) }))
    .filter((g) => g.list.length)
  const total = shipped.length
  const weeks = 10
  let hover = $state<AreaId | null>(null)
</script>

<section class="wrap section" id="time">
  <div class="section-head">
    <div>
      <span class="eyebrow">Where our time went</span>
      <h2>{total} changes shipped in {weeks} weeks</h2>
      <p>Every finished change from the last {weeks} weeks, sorted by what it does for you.</p>
    </div>
  </div>
  <div class="card panel">
    <div class="bar" role="img" aria-label={groups.map((g) => `${g.name}: ${g.list.length}`).join(', ')}>
      {#each groups as g (g.id)}
        <span
          class="seg"
          class:dim={hover && hover !== g.id}
          style="flex: {g.list.length}; background: {g.color}"
          title="{g.name}: {g.list.length} ({Math.round((g.list.length / total) * 100)}%)"
        ></span>
      {/each}
    </div>
    <ul class="legend">
      {#each groups as g (g.id)}
        <li
          class:dim={hover && hover !== g.id}
          onpointerenter={() => (hover = g.id)}
          onpointerleave={() => (hover = null)}
        >
          <span class="swatch" style="background: {g.color}"></span>
          <div>
            <p class="name"><strong>{g.name}</strong> <span class="n">{g.list.length} · {Math.round((g.list.length / total) * 100)}%</span></p>
            <p class="blurb">{g.blurb}</p>
            <ul class="eg">
              {#each g.list.slice(0, 3) as item (item.key)}
                <li><a href={item.url} target="_blank" rel="noreferrer">{plainTitle(item)}</a></li>
              {/each}
            </ul>
          </div>
        </li>
      {/each}
    </ul>
  </div>
</section>

<style>
  .panel {
    padding: 24px;
  }
  .bar {
    display: flex;
    gap: 2px;
    height: 44px;
    border-radius: 10px;
    overflow: hidden;
  }
  .seg {
    transition: opacity 0.15s;
    min-width: 6px;
  }
  .dim {
    opacity: 0.35;
  }
  .legend {
    list-style: none;
    padding: 0;
    margin: 22px 0 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
  }
  .legend > li {
    display: grid;
    grid-template-columns: 14px 1fr;
    gap: 10px;
    transition: opacity 0.15s;
  }
  .swatch {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    margin-top: 5px;
  }
  .name {
    margin: 0;
  }
  .n {
    color: var(--ink-soft);
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .blurb {
    margin: 2px 0 6px;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .eg {
    margin: 0;
    padding-left: 16px;
    font-size: 0.85rem;
  }
  .eg li {
    margin: 2px 0;
  }
</style>
