<script lang="ts">
  import { areaOf, areas, closedIssues, fmtDate, isBehindScenes, plainTitle, releases, shipped, weekOf, type AreaId, type Item } from './model'

  // An issue closed by a PR shown here would be a duplicate line.
  const closedByShipped = new Set(shipped.flatMap((p) => p.refs ?? []))
  const entries: Item[] = [...shipped, ...closedIssues.filter((i) => !closedByShipped.has(i.key))]

  const weeks = [...new Set([...entries.map((i) => weekOf(i.closedAt!)), ...releases.map((r) => weekOf(r.date))])]
    .sort()
    .reverse()
    .map((week) => {
      const list = entries.filter((i) => weekOf(i.closedAt!) === week)
      return {
        week,
        front: list.filter((i) => !isBehindScenes(i)),
        back: list.filter(isBehindScenes),
        releases: releases.filter((r) => weekOf(r.date) === week && r.repo === 'lexbox'),
      }
    })

  const split = (Object.keys(areas) as AreaId[])
    .map((id) => ({ id, ...areas[id], n: shipped.filter((i) => areaOf(i) === id).length }))
    .filter((g) => g.n)
  const pct = (n: number) => Math.round((n / shipped.length) * 100)

  let count = $state(4)
</script>

<section class="wrap section" id="journal">
  <div class="section-head">
    <div>
      <span class="eyebrow">Field journal</span>
      <h2>What we finished, week by week</h2>
      <p>
        {shipped.length} changes in the last 10 weeks, newest week on top. Releases are when the finished work reached your
        device.
      </p>
    </div>
  </div>
  <div class="split">
    <div class="bar" role="img" aria-label={split.map((g) => `${g.name}: ${g.n}`).join(', ')}>
      {#each split as g (g.id)}<span style="flex: {g.n}; background: {g.color}"></span>{/each}
    </div>
    <ul class="legend">
      {#each split as g (g.id)}
        <li title={g.blurb}><span class="dot" style="background: {g.color}"></span>{g.name} <span class="n">{g.n} · {pct(g.n)}%</span></li>
      {/each}
    </ul>
  </div>
  <ol class="weeks">
    {#each weeks.slice(0, count) as w (w.week)}
      <li class="week">
        <div class="date">
          <span class="hand">week of</span>
          <strong>{fmtDate(w.week).replace(/, \d{4}$/, '')}</strong>
        </div>
        <div class="card page">
          {#each w.releases as r}
            <a class="release" href={r.url} target="_blank" rel="noreferrer">🚀 New version out {fmtDate(r.date).replace(/, \d{4}$/, '')}</a>
          {/each}
          <ul>
            {#each w.front as item (item.key)}
              <li>
                <span class="dot" style="background: {areas[areaOf(item)].color}" title={areas[areaOf(item)].name}></span>
                <a href={item.url} target="_blank" rel="noreferrer">{plainTitle(item)}</a>
              </li>
            {/each}
          </ul>
          {#if w.back.length}
            <details>
              <summary>+ {w.back.length} behind-the-scenes {w.back.length === 1 ? 'change' : 'changes'}</summary>
              <ul>
                {#each w.back as item (item.key)}
                  <li>
                    <span class="dot" style="background: {areas.backstage.color}"></span>
                    <a href={item.url} target="_blank" rel="noreferrer">{plainTitle(item)}</a>
                  </li>
                {/each}
              </ul>
            </details>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
  {#if count < weeks.length}
    <button class="more" onclick={() => (count += 4)}>Show earlier weeks</button>
  {/if}
</section>

<style>
  .split {
    margin: 0 0 28px;
  }
  .bar {
    display: flex;
    gap: 2px;
    height: 14px;
    border-radius: 7px;
    overflow: hidden;
  }
  .bar span {
    min-width: 4px;
  }
  .legend {
    list-style: none;
    padding: 0;
    margin: 10px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-size: 0.9rem;
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .legend .n {
    color: var(--ink-soft);
    white-space: nowrap;
  }
  .weeks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 18px;
    position: relative;
  }
  .week {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 18px;
  }
  .date {
    text-align: right;
    padding-top: 12px;
    line-height: 1.1;
  }
  .date strong {
    display: block;
    font-family: var(--font-display);
    font-size: 1.35rem;
  }
  .hand {
    font-family: var(--font-hand);
    font-size: 1.2rem;
    color: var(--ink-soft);
  }
  .page {
    padding: 14px 20px 14px 30px;
    background: linear-gradient(90deg, transparent 16px, color-mix(in srgb, var(--c-rust) 35%, transparent) 16px 17.5px, transparent 17.5px), var(--card);
  }
  .release {
    display: inline-block;
    font-weight: 700;
    background: var(--ink);
    color: var(--paper);
    padding: 3px 12px;
    border-radius: 99px;
    text-decoration: none;
    margin: 0 6px 8px 0;
    font-size: 0.88rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    columns: 2 320px;
    column-gap: 28px;
  }
  li li {
    break-inside: avoid;
    padding: 4px 0;
    display: grid;
    grid-template-columns: 12px 1fr;
    gap: 8px;
    align-items: baseline;
    font-size: 0.95rem;
  }
  li li a {
    text-decoration: none;
  }
  li li a:hover {
    text-decoration: underline;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  summary {
    cursor: pointer;
    color: var(--ink-soft);
    font-size: 0.9rem;
    padding: 6px 0 2px;
  }
  .more {
    margin: 16px 0 0 128px;
    background: none;
    border: 1.5px solid var(--line);
    border-radius: 99px;
    padding: 6px 16px;
    cursor: pointer;
  }
  @media (max-width: 640px) {
    .week {
      grid-template-columns: 1fr;
      gap: 4px;
    }
    .date {
      text-align: left;
    }
    .more {
      margin-left: 0;
    }
  }
</style>
