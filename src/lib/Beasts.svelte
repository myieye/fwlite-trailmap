<script lang="ts">
  import { beasts, camps, plainTitle } from './model'

  const order = [...beasts].sort((a, b) => Number(a.slain) - Number(b.slain) || a.left - b.left)
  const campName = (id?: string) => camps.find((c) => c.id === id)
</script>

<section class="wrap section" id="beasts">
  <div class="section-head">
    <div>
      <span class="eyebrow">Wanted</span>
      <h2>The beasts we're hunting</h2>
      <p>
        Hard, long-running bugs, mostly ones that could lose someone's work. They take weeks to pin down, so each poster
        shows how far the hunt has come, not just whether it's over.
      </p>
    </div>
  </div>
  <div class="grid">
    {#each order as beast (beast.item.key)}
      {@const camp = campName(beast.camp)}
      <article class="poster" class:slain={beast.slain} class:sleeping={beast.sleeping}>
        <p class="wanted">{beast.slain ? 'Defeated' : 'Wanted'}</p>
        <div class="creature" aria-hidden="true">{beast.creature}</div>
        <h3>{beast.name}</h3>
        <p class="lore">{beast.lore}</p>
        <ol class="ladder" aria-label="Hunt progress">
          {#each beast.steps as step}
            <li class:done={step.done}>
              <span class="dot">{step.done ? '✓' : ''}</span>
              <span>
                {step.label}
                {#if step.signal}
                  <small>{#if step.link}<a href={step.link} target="_blank" rel="noreferrer">{step.signal}</a>{:else}{step.signal}{/if}</small>
                {/if}
              </span>
            </li>
          {/each}
        </ol>
        <p class="foot">
          {#if beast.slain}
            Survived {beast.days} days
          {:else if beast.sleeping}
            💤 Sleeping: nobody has touched it in 60+ days
          {:else}
            At large for <strong>{beast.days} days</strong>
          {/if}
          {#if camp}<br />Guards <a href="#camp-{camp.id}">{camp.icon} {camp.name}</a>{/if}
        </p>
        <a class="issue" href={beast.item.url} target="_blank" rel="noreferrer"
          >#{beast.item.number} · {plainTitle(beast.item)}</a
        >
        {#if beast.slain}<span class="stamp" aria-hidden="true">Defeated</span>{/if}
      </article>
    {/each}
  </div>
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 18px;
  }
  .poster {
    position: relative;
    padding: 18px 18px 16px;
    background:
      radial-gradient(circle at 30% 20%, #fff3 0, transparent 60%),
      color-mix(in srgb, var(--c-sun) 14%, var(--card));
    border: 2px solid var(--ink);
    border-radius: 6px;
    box-shadow:
      6px 6px 0 color-mix(in srgb, var(--ink) 85%, transparent),
      var(--shadow);
    text-align: center;
    rotate: -0.6deg;
    display: flex;
    flex-direction: column;
  }
  .poster:nth-child(2n) {
    rotate: 0.8deg;
  }
  .poster:nth-child(3n) {
    rotate: -0.2deg;
  }
  .wanted {
    font-family: var(--font-display);
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-size: 1.6rem;
    margin: 0;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 4px;
  }
  .creature {
    font-size: 4.2rem;
    line-height: 1.25;
    font-family: 'Noto Color Emoji', sans-serif;
    margin: 6px 0 2px;
  }
  .sleeping .creature {
    filter: grayscale(1);
    opacity: 0.6;
  }
  h3 {
    font-size: 1.3rem;
    font-weight: 900;
  }
  .lore {
    font-size: 0.92rem;
    margin: 6px 0 12px;
  }
  .ladder {
    list-style: none;
    padding: 0;
    margin: 0 0 12px;
    text-align: left;
    font-size: 0.88rem;
    display: grid;
    gap: 4px;
  }
  .ladder li {
    display: grid;
    grid-template-columns: 22px 1fr;
    gap: 8px;
    align-items: center;
    color: var(--ink-soft);
  }
  .ladder li.done {
    color: var(--ink);
    font-weight: 700;
  }
  .ladder small {
    font-weight: 400;
    color: var(--ink-soft);
    margin-left: 4px;
  }
  .dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px dashed var(--ink-soft);
    display: grid;
    place-items: center;
    font-size: 0.75rem;
  }
  .done .dot {
    border: 2px solid var(--ink);
    background: var(--c-sage);
    color: #fff;
  }
  .foot {
    font-size: 0.88rem;
    margin: auto 0 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--ink-soft);
  }
  .issue {
    font-size: 0.76rem;
    color: var(--ink-soft);
  }
  .stamp {
    position: absolute;
    top: 42%;
    left: 50%;
    translate: -50% -50%;
    rotate: -18deg;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 2.2rem;
    text-transform: uppercase;
    color: var(--c-rust);
    border: 4px double var(--c-rust);
    padding: 2px 14px;
    border-radius: 8px;
    opacity: 0.85;
  }
</style>
