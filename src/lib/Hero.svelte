<script lang="ts">
  import { camps, fmtDate, generatedAt, site, summit } from './model'

  const next = camps.find((c) => c.pct < 1)
  const left = summit.total - summit.done - summit.working
  const seg = (n: number) => `${(n / summit.total) * 100}%`

  let theme = $state<string | null>(null)
  function toggleTheme() {
    const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    theme = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
  }
</script>

<header class="wrap hero">
  <div class="top">
    <span class="brand"><span aria-hidden="true">⛰️</span> Trailmap <span class="muted">· {site.team}</span></span>
    <button class="theme" onclick={toggleTheme} aria-label="Switch between day and night">☀️ / 🌙</button>
  </div>

  <span class="eyebrow">Field report · {fmtDate(generatedAt.toISOString())}</span>
  <h1>{site.title}</h1>
  <p class="lede">{site.summitBlurb}</p>

  <section class="strip card" aria-label="Progress to 1.0">
    <div class="big">
      <span class="pct">{Math.round(summit.pct * 100)}<small>%</small></span>
      <span class="hand">of the way there</span>
    </div>
    <div class="detail">
      <p class="counts">
        <strong>{summit.done} of {summit.total}</strong> pieces of work done,
        <strong>{summit.working}</strong> being worked on, <strong>{left}</strong> still to start.
      </p>
      <div class="bar" aria-hidden="true">
        <span class="done" style="width: {seg(summit.done)}"></span>
        <span class="working" style="width: {seg(summit.working)}"></span>
      </div>
      <p class="legend">
        <span><i class="done"></i>Done</span>
        <span><i class="working"></i>In progress</span>
        <span><i></i>To do</span>
        {#if next}<span class="next">Next camp: <a href="#camp-{next.id}">{next.icon} {next.name}</a> ({next.done} of {next.total})</span>{/if}
      </p>
    </div>
  </section>
</header>

<style>
  .hero {
    padding-top: 18px;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
  }
  .brand {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.15rem;
  }
  .brand .muted {
    font-weight: 400;
    font-size: 0.95rem;
  }
  .theme {
    border: 1.5px solid var(--line);
    background: var(--card);
    border-radius: 99px;
    padding: 6px 14px;
    cursor: pointer;
    font-family: var(--font-body);
  }
  h1 {
    font-size: clamp(2.6rem, 7vw, 5.4rem);
    font-weight: 900;
    max-width: 14ch;
  }
  .lede {
    font-size: 1.15rem;
    max-width: 58ch;
    margin: 18px 0 28px;
    color: var(--ink-soft);
  }
  .strip {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 28px;
    align-items: center;
    padding: 22px 28px;
    margin-bottom: 24px;
  }
  .big {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
  }
  .pct {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 5rem;
    color: var(--c-rust);
    font-variation-settings: 'SOFT' 100, 'WONK' 1;
  }
  .pct small {
    font-size: 0.5em;
  }
  .hand {
    font-family: var(--font-hand);
    font-size: 1.5rem;
  }
  .counts {
    margin: 0 0 12px;
    font-size: 1.1rem;
  }
  .bar {
    display: flex;
    gap: 2px;
    height: 18px;
    border-radius: 99px;
    overflow: hidden;
    background: var(--paper-2);
  }
  .bar span {
    display: block;
  }
  .done,
  .legend i.done {
    background: var(--c-sage);
  }
  .working,
  .legend i.working {
    background: var(--c-sun);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin: 10px 0 0;
    font-size: 0.9rem;
    color: var(--ink-soft);
  }
  .legend i {
    display: inline-block;
    width: 11px;
    height: 11px;
    border-radius: 3px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    margin-right: 6px;
    vertical-align: -1px;
  }
  .next {
    margin-left: auto;
    color: var(--ink);
  }
  @media (max-width: 640px) {
    .strip {
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 18px;
    }
    .next {
      margin-left: 0;
    }
  }
</style>
