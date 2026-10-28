<script lang="ts">
  import { camps, claimedBy, daysBetween, dropped, fmtDate, generatedAt, isDataRisk, isDone, plainTitle, summit, weekOf, type Camp, type Item } from './model'

  const SHOWN = 6
  const WEEKS = 8

  const onTrail = [...new Map(camps.flatMap((camp, i) => camp.items.map((item) => [item.key, { item, camp, i }]))).values()]
  const quests = onTrail
    .filter(({ item }) => !isDone(item) && !claimedBy(item))
    .sort((a, b) => +isDataRisk(b.item) - +isDataRisk(a.item) || a.i - b.i || a.item.createdAt.localeCompare(b.item.createdAt))

  const toGo = summit.total - summit.done
  const closed = onTrail.map((q) => q.item).filter((i) => isDone(i) && !dropped(i))
  const thisWeek = weekOf(generatedAt)
  const weeks = Array.from({ length: WEEKS }, (_, n) => {
    const d = new Date(thisWeek)
    d.setUTCDate(d.getUTCDate() - 7 * (WEEKS - 1 - n))
    const week = d.toISOString().slice(0, 10)
    return { week, n: closed.filter((i) => weekOf(i.closedAt!) === week).length }
  })
  const lastFour = closed.filter((i) => daysBetween(i.closedAt!, generatedAt) < 28).length
  const peak = Math.max(1, ...weeks.map((w) => w.n))

  let showAll = $state(false)
  const shown = $derived(showAll ? quests : quests.slice(0, SHOWN))
  const quickWin = (item: Item) => item.labels.includes('Good 1st issue')
  const campLabel = (camp: Camp) => `${camp.icon} ${camp.name}`
</script>

<section class="wrap section" id="quests">
  <div class="section-head">
    <div>
      <span class="eyebrow">Dev mode · Quest board</span>
      <h2>Pick your next step</h2>
      {#if toGo}
        <p class="pace">
          <strong>{toGo} to go</strong> before 1.0 · {weeks.at(-1)!.n} closed this week · {lastFour} in the last 4 weeks. Each one
          moves the 🤠 up the trail.
        </p>
      {:else}
        <p class="pace"><strong>All done.</strong> Ship it. 🚩</p>
      {/if}
    </div>
    <div class="weeks" role="img" aria-label="1.0 issues closed per week, last {WEEKS} weeks: {weeks.map((w) => w.n).join(', ')}">
      {#each weeks as w (w.week)}
        <span class:now={w.week === thisWeek} style="height: {Math.max(6, (w.n / peak) * 100)}%" title="Week of {fmtDate(w.week)}: {w.n}"
        ></span>
      {/each}
    </div>
  </div>

  {#if quests.length}
    <ol class="card list">
      {#each shown as { item, camp }, n (item.key)}
        <li class:next={n === 0}>
          <span class="title">
            {#if n === 0}<span class="chip" style="--chip: var(--c-rust)">Next up</span>{/if}
            {plainTitle(item)}
          </span>
          <span class="sub">
            <a href={item.url} target="_blank" rel="noreferrer">#{item.number}{#if plainTitle(item) !== item.title}&ensp;{item.title}{/if}</a>
            · <a href="#camp-{camp.id}">{campLabel(camp)}</a>
            · {daysBetween(item.createdAt, generatedAt)}d old
          </span>
          <span class="tags">
            {#if isDataRisk(item)}<span class="chip" style="--chip: var(--c-rust)">data risk</span>{/if}
            {#if quickWin(item)}<span class="chip" style="--chip: var(--c-sage)">quick win</span>{/if}
          </span>
        </li>
      {/each}
    </ol>
    <p class="note">
      Nobody is assigned to these and none has a PR. Assign yourself on GitHub to claim one; this list is from {fmtDate(
        generatedAt.toISOString(),
      )}, so check it's still free.
    </p>
    {#if quests.length > SHOWN}
      <button class="more" onclick={() => (showAll = !showAll)}>{showAll ? 'Show fewer' : `Show all ${quests.length}`}</button>
    {/if}
  {:else if toGo}
    <p class="card list empty">Everything left is claimed. <a href="#campfire">Review a PR at the campfire →</a></p>
  {/if}
</section>

<style>
  .pace strong {
    color: var(--ink);
  }
  .weeks {
    display: flex;
    align-items: end;
    gap: 4px;
    height: 44px;
  }
  .weeks span {
    width: 12px;
    border-radius: 3px 3px 0 0;
    background: color-mix(in srgb, var(--c-sage) 55%, transparent);
  }
  .weeks .now {
    background: var(--c-sun);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 6px 22px;
  }
  li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 12px;
    padding: 12px 0;
    border-top: 1px dashed var(--line);
  }
  li:first-child {
    border-top: none;
  }
  .title {
    font-weight: 600;
  }
  .next .title {
    font-weight: 800;
    font-size: 1.08rem;
  }
  .next .chip {
    margin-right: 6px;
  }
  .sub {
    grid-row: 2;
    font-size: 0.82rem;
    color: var(--ink-soft);
  }
  .tags {
    grid-row: 1 / 3;
    grid-column: 2;
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .note {
    font-size: 0.85rem;
    color: var(--ink-soft);
    margin: 10px 2px 0;
  }
  .empty {
    padding: 16px 22px;
  }
  .more {
    margin-top: 14px;
    background: none;
    border: 1.5px solid var(--line);
    border-radius: 99px;
    padding: 6px 16px;
    cursor: pointer;
  }
  @media (max-width: 560px) {
    li {
      grid-template-columns: 1fr;
    }
    .tags {
      grid-row: auto;
      grid-column: 1;
    }
  }
</style>
