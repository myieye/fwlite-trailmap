<script lang="ts">
  import Campfire from './lib/Campfire.svelte'
  import CampCard from './lib/CampCard.svelte'
  import Hero from './lib/Hero.svelte'
  import Journal from './lib/Journal.svelte'
  import River from './lib/River.svelte'
  import TrailMap from './lib/TrailMap.svelte'
  import Voices from './lib/Voices.svelte'
  import { camps, fmtDate, generatedAt, summit } from './lib/model'
</script>

<Hero />

<main>
  <div class="wrap">
    <TrailMap {camps} start={summit.start} />
  </div>

  <section class="wrap section" id="camps">
    <div class="section-head">
      <div>
        <span class="eyebrow">The camps</span>
        <h2>What's left before 1.0</h2>
        <p>
          The 1.0 plan, grouped into camps along the trail.
        </p>
      </div>
    </div>
    <div class="camps">
      {#each camps as camp, i (camp.id)}<div class="slot"><CampCard {camp} n={i + 1} /></div>{/each}
    </div>
  </section>

  <Campfire />
  <Voices />
  <Journal />
  <River />
</main>

<footer class="wrap">
  <p>
    Pulled from GitHub (<a href={summit.url}>the {summit.name} milestone</a>, FW Lite, Lexbox and Harmony) and the SIL
    community forum on {fmtDate(generatedAt.toISOString())}.
  </p>
</footer>

<style>
  .camps {
    columns: 3 330px;
    column-gap: 22px;
  }
  /* Padding, not margin: browsers drop margins at a column break, and the camp number sticks out above its card. */
  .slot {
    break-inside: avoid;
    padding: 14px 0 12px;
  }
  footer {
    padding: 64px 16px 48px;
    color: var(--ink-soft);
    font-size: 0.9rem;
    max-width: 760px;
    text-align: center;
  }
</style>
