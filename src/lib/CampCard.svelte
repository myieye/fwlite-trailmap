<script lang="ts">
  import ItemRow from './ItemRow.svelte'
  import { dropped, isDataRisk, isDone, type Camp } from './model'

  let { camp, n }: { camp: Camp; n: number } = $props()

  const open = $derived(camp.items.filter((i) => !isDone(i)).sort((a, b) => +isDataRisk(b) - +isDataRisk(a)))
  const risks = $derived(open.filter(isDataRisk).length)
  const done = $derived(camp.items.filter((i) => isDone(i) && !dropped(i)))
  const status = $derived(camp.pct === 1 ? 'Reached' : camp.done ? 'Climbing' : 'Up ahead')
</script>

<article class="camp card" id="camp-{camp.id}" class:reached={camp.pct === 1}>
  <header>
    <span class="num">{n}</span>
    <span class="icon" aria-hidden="true">{camp.icon}</span>
    <div>
      <span class="chip" style="--chip: {camp.pct === 1 ? 'var(--c-sage)' : camp.done ? 'var(--c-sun)' : 'var(--ink-soft)'}"
        >{status}</span
      >
      <h3>{camp.name}</h3>
    </div>
  </header>
  <p class="blurb">{camp.blurb}</p>
  <div class="bar" role="progressbar" aria-valuenow={camp.done} aria-valuemax={camp.total} aria-label="{camp.name} progress">
    <span style="width: {camp.pct * 100}%"></span>
  </div>
  <p class="count"><strong>{camp.done}</strong> of {camp.total} done{#if open.length}, {open.length} to go{/if}</p>
  {#if risks}<p class="risks">{risks} known data-risk {risks === 1 ? 'bug' : 'bugs'} still open</p>{/if}
  {#if open.length}
    <ul>
      {#each open as item (item.key)}<ItemRow {item} showAge />{/each}
    </ul>
  {/if}
  {#if done.length}
    <details>
      <summary>{done.length} finished ✓</summary>
      <ul>
        {#each done as item (item.key)}<ItemRow {item} />{/each}
      </ul>
    </details>
  {/if}
</article>

<style>
  .risks {
    margin: -4px 0 8px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--c-rust);
  }
  .camp {
    padding: 20px 22px 16px;
    scroll-margin-top: 24px;
    position: relative;
  }
  .camp:target {
    outline: 3px solid var(--c-sun);
  }
  .reached {
    background: color-mix(in srgb, var(--c-sage) 12%, var(--card));
  }
  header {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .num {
    position: absolute;
    top: -12px;
    left: -10px;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    font-family: var(--font-display);
    font-weight: 900;
  }
  .icon {
    font-size: 2.1rem;
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--paper-2);
    flex: none;
  }
  h3 {
    font-size: 1.45rem;
    font-weight: 800;
    margin-top: 4px;
  }
  .blurb {
    margin: 12px 0 14px;
  }
  .bar {
    height: 12px;
    border-radius: 99px;
    background: var(--paper-2);
    overflow: hidden;
    border: 1.5px solid var(--line);
  }
  .bar span {
    display: block;
    height: 100%;
    background: repeating-linear-gradient(-45deg, var(--c-sage) 0 8px, color-mix(in srgb, var(--c-sage) 80%, white) 8px 16px);
    border-radius: inherit;
  }
  .count {
    font-size: 0.9rem;
    margin: 6px 0 4px;
    color: var(--ink-soft);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  details {
    margin-top: 8px;
  }
  summary {
    cursor: pointer;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--c-forest);
    padding: 4px 0;
  }
</style>
