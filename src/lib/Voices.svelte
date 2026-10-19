<script lang="ts">
  import { voiceStatus, voices, type Voice } from './model'

  const forumHome = 'https://community.software.sil.org/c/fwlite/fwlite-feature-requests/50'
  const statuses = Object.keys(voiceStatus) as Voice['status'][]
  const counts = Object.fromEntries(statuses.map((s) => [s, voices.filter((v) => v.status === s).length]))
  let filter = $state<Voice['status'] | null>(null)
  let all = $state(false)
  const list = $derived(voices.filter((v) => !filter || v.status === filter))
  const shown = $derived(all ? list : list.slice(0, 12))
</script>

<section class="wrap section" id="voices">
  <div class="section-head">
    <div>
      <span class="eyebrow">Community voices</span>
      <h2>Your requests, and where they landed</h2>
      <p>
        Every feature request from the FW Lite forum, most-wanted first. When one is tracked on GitHub, you can see whether
        it's done, on the road to 1.0, or planned for later.
      </p>
    </div>
    <a class="cta" href={forumHome} target="_blank" rel="noreferrer">Vote or suggest on the forum →</a>
  </div>

  <div class="filters" role="group" aria-label="Filter by status">
    <button class:on={!filter} onclick={() => (filter = null)}>All {voices.length}</button>
    {#each statuses as s}
      <button class:on={filter === s} style="--chip: {voiceStatus[s].color}" onclick={() => (filter = filter === s ? null : s)}>
        <span class="swatch"></span>{voiceStatus[s].label} {counts[s]}
      </button>
    {/each}
  </div>

  <ul class="list">
    {#each shown as v (v.id)}
      <li class="card voice">
        <div class="votes" title="{v.votes} votes on the forum">
          <strong>{v.votes}</strong>
          <span>{v.votes === 1 ? 'vote' : 'votes'}</span>
        </div>
        <div class="body">
          <a class="title" href={v.url} target="_blank" rel="noreferrer">{v.title}</a>
          <p class="meta">
            <span class="chip" style="--chip: {voiceStatus[v.status].color}">{voiceStatus[v.status].label}</span>
            {#if v.camp}<a href="#camp-{v.camp.id}">{v.camp.icon} {v.camp.name}</a>{/if}
            {#each v.linked as i}<a class="gh" href={i.url} target="_blank" rel="noreferrer">#{i.number}</a>{/each}
            <span class="muted">{v.replies} {v.replies === 1 ? 'reply' : 'replies'} · {v.likes} ♥</span>
          </p>
        </div>
      </li>
    {/each}
  </ul>
  {#if list.length > 12}
    <button class="more" onclick={() => (all = !all)}>{all ? 'Show fewer' : `Show all ${list.length}`}</button>
  {/if}
</section>

<style>
  .cta {
    font-weight: 700;
    background: var(--c-rust);
    color: #fff;
    padding: 10px 18px;
    border-radius: 99px;
    text-decoration: none;
    box-shadow: var(--shadow);
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }
  .filters button {
    border: 1.5px solid var(--line);
    background: var(--card);
    border-radius: 99px;
    padding: 5px 14px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .filters button.on {
    background: var(--ink);
    color: var(--paper);
  }
  .swatch {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--chip);
    margin-right: 6px;
  }
  .list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 12px;
  }
  .voice {
    display: grid;
    grid-template-columns: 62px 1fr;
    gap: 14px;
    padding: 12px 16px 12px 12px;
    align-items: center;
  }
  .votes {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 62px;
    border-radius: 14px;
    background: var(--paper-2);
    line-height: 1;
  }
  .votes strong {
    font-family: var(--font-display);
    font-size: 1.7rem;
    font-weight: 900;
  }
  .votes span {
    font-size: 0.72rem;
    color: var(--ink-soft);
  }
  .title {
    font-weight: 700;
    text-decoration: none;
  }
  .title:hover {
    text-decoration: underline;
  }
  .meta {
    margin: 4px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: center;
    font-size: 0.82rem;
  }
  .gh {
    color: var(--ink-soft);
  }
  .more {
    margin-top: 14px;
    background: none;
    border: 1.5px solid var(--line);
    border-radius: 99px;
    padding: 6px 16px;
    cursor: pointer;
  }
  @media (max-width: 400px) {
    .list {
      grid-template-columns: 1fr;
    }
  }
</style>
