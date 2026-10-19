<script lang="ts">
  import { areaOf, areas, campOf, daysBetween, generatedAt, inFlight, items, plainTitle, repoLabel } from './model'

  const ready = inFlight.filter((p) => !p.draft)
  const sketches = inFlight.filter((p) => p.draft)
  let all = $state(false)
  const shown = $derived(all ? ready : ready.slice(0, 9))
  const target = (refs?: string[]) => refs?.map((r) => items[r]).find(Boolean)
</script>

<section class="wrap section" id="campfire">
  <div class="section-head">
    <div>
      <span class="eyebrow">Around the campfire</span>
      <h2>Being worked on right now</h2>
      <p>
        {ready.length} changes are written and waiting for review or finishing touches, and {sketches.length} more are early
        sketches.
      </p>
    </div>
  </div>
  <ul class="grid">
    {#each shown as pr (pr.key)}
      {@const area = areas[areaOf(pr)]}
      {@const issue = target(pr.refs)}
      {@const camp = issue && campOf(issue.key)}
      <li class="card ember" style="--area: {area.color}">
        <span class="chip" style="--chip: {area.color}">{area.name}</span>
        <a class="title" href={pr.url} target="_blank" rel="noreferrer">{plainTitle(pr)}</a>
        <span class="gh">#{pr.number}&ensp;{pr.title}</span>
        <span class="meta">
          {repoLabel(pr.repo)} · {pr.author} · open {daysBetween(pr.createdAt, generatedAt)}d
          {#if camp}<br />Moves camp <a href="#camp-{camp.id}">{camp.icon} {camp.name}</a> forward{/if}
        </span>
      </li>
    {/each}
  </ul>
  {#if ready.length > 9}
    <button class="more" onclick={() => (all = !all)}>{all ? 'Show fewer' : `Show all ${ready.length}`}</button>
  {/if}
</section>

<style>
  .grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }
  .ember {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 5px solid var(--area);
  }
  .chip {
    align-self: start;
  }
  .title {
    font-weight: 700;
    font-size: 1.05rem;
    line-height: 1.3;
    text-decoration: none;
  }
  .title:hover {
    text-decoration: underline;
  }
  .gh {
    font-size: 0.76rem;
    color: var(--ink-soft);
  }
  .meta {
    font-size: 0.84rem;
    color: var(--ink-soft);
    margin-top: auto;
  }
  .more {
    margin-top: 14px;
    background: none;
    border: 1.5px solid var(--line);
    border-radius: 99px;
    padding: 6px 16px;
    cursor: pointer;
  }
</style>
