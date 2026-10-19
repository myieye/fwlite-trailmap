<script lang="ts">
  import { ageDays, dropped, hasOpenPr, plainTitle, type Item } from './model'

  let { item, showAge = false }: { item: Item; showAge?: boolean } = $props()

  const state = $derived(
    dropped(item) ? 'dropped' : item.state !== 'open' ? 'done' : hasOpenPr(item) ? 'working' : 'todo',
  )
  const glyph = { dropped: '–', done: '✓', working: '◐', todo: '○' }
  const label = { dropped: 'Dropped', done: 'Done', working: 'Being worked on', todo: 'To do' }
  const plain = $derived(plainTitle(item))
</script>

<li class="row {state}">
  <span class="glyph" title={label[state]} aria-label={label[state]}>{glyph[state]}</span>
  <span class="text">
    <span class="title">{plain}</span>
    <a class="gh" href={item.url} target="_blank" rel="noreferrer"
      >#{item.number}{#if plain !== item.title}&ensp;{item.title}{/if}</a
    >
  </span>
  <span class="meta">
    {#if state === 'working'}<span class="chip" style="--chip: var(--c-sun)">in progress</span>{/if}
    {#if showAge && item.state === 'open'}<span title="Days since it was reported">{ageDays(item)}d</span>{/if}
  </span>
</li>

<style>
  .row {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    gap: 8px;
    align-items: start;
    padding: 8px 0;
    border-top: 1px dashed var(--line);
    font-size: 0.95rem;
    line-height: 1.35;
  }
  .glyph {
    font-weight: 700;
    text-align: center;
    color: var(--ink-soft);
  }
  .text {
    min-width: 0;
  }
  .gh {
    display: block;
    font-size: 0.76rem;
    color: var(--ink-soft);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gh:hover {
    text-decoration: underline;
  }
  .done .glyph {
    color: var(--c-sage);
  }
  .done .title {
    color: var(--ink-soft);
  }
  .dropped .title {
    color: var(--ink-soft);
    text-decoration: line-through;
  }
  .working .glyph {
    color: var(--c-sun);
  }
  .meta {
    font-size: 0.78rem;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
  }
</style>
