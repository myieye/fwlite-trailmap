<script lang="ts">
  import ItemRow from './ItemRow.svelte'
  import { dropped, isDone, river } from './model'
</script>

<section class="river-band" id="harmony">
  <svg class="waves" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 40 C 150 0 300 0 450 20 S 750 40 900 18 S 1100 0 1200 14 L1200 40Z" fill="var(--river-bg)" />
  </svg>
  <div class="wrap inner">
    <div class="section-head">
      <div>
        <span class="eyebrow">The Harmony river</span>
        <h2>The sync engine underneath it all</h2>
        <p>
          Harmony is the part that lets everyone edit offline, on any device, and still end up with the same dictionary. It's
          invisible when it works, so here's what we're doing to it.
        </p>
      </div>
    </div>
    <div class="grid">
      {#each river as goal (goal.id)}
        {@const open = goal.items.filter((i) => !isDone(i))}
        {@const done = goal.items.filter((i) => isDone(i) && !dropped(i))}
        <article class="card buoy">
          <header>
            <span class="icon" aria-hidden="true">{goal.icon}</span>
            <h3>{goal.name}</h3>
          </header>
          <p class="blurb">{goal.blurb}</p>
          <div class="bar"><span style="width: {goal.pct * 100}%"></span></div>
          <p class="count"><strong>{goal.done} of {goal.total}</strong> done</p>
          {#if open.length}
            <ul>{#each open as item (item.key)}<ItemRow {item} />{/each}</ul>
          {/if}
          {#if done.length}
            <details>
              <summary>{done.length} finished ✓</summary>
              <ul>{#each done as item (item.key)}<ItemRow {item} />{/each}</ul>
            </details>
          {/if}
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .river-band {
    --river-bg: color-mix(in srgb, var(--c-river) 22%, var(--paper));
    margin-top: 56px;
  }
  .waves {
    display: block;
    width: 100%;
    height: 40px;
  }
  .inner {
    background: var(--river-bg);
    max-width: none;
    padding-bottom: 40px;
  }
  .inner > * {
    max-width: 1148px;
    margin-left: auto;
    margin-right: auto;
  }
  .section-head {
    padding-top: 16px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
    align-items: start;
  }
  .buoy {
    padding: 18px 20px;
  }
  header {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .icon {
    font-size: 1.8rem;
  }
  h3 {
    font-size: 1.2rem;
    font-weight: 800;
  }
  .blurb {
    font-size: 0.92rem;
    margin: 8px 0 12px;
  }
  .bar {
    height: 10px;
    border-radius: 99px;
    background: var(--paper-2);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--c-river);
  }
  .count {
    font-size: 0.88rem;
    color: var(--ink-soft);
    margin: 6px 0 4px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  summary {
    cursor: pointer;
    font-weight: 700;
    font-size: 0.88rem;
    color: var(--c-forest);
    padding: 6px 0 2px;
  }
</style>
