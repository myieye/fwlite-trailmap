<script lang="ts">
  import Beasts from './lib/Beasts.svelte'
  import Campfire from './lib/Campfire.svelte'
  import CampCard from './lib/CampCard.svelte'
  import Hero from './lib/Hero.svelte'
  import Journal from './lib/Journal.svelte'
  import River from './lib/River.svelte'
  import TimeSplit from './lib/TimeSplit.svelte'
  import TrailMap from './lib/TrailMap.svelte'
  import Trophies from './lib/Trophies.svelte'
  import Voices from './lib/Voices.svelte'
  import { beasts, camps, fmtDate, generatedAt, summit } from './lib/model'
</script>

<Hero />

<main>
  <div class="wrap">
    <TrailMap {camps} {beasts} start={summit.start} />
  </div>

  <section class="wrap section" id="camps">
    <div class="section-head">
      <div>
        <span class="eyebrow">The camps</span>
        <h2>What's left before 1.0</h2>
        <p>
          The 1.0 plan, grouped into camps along the trail. Camps say what we'll do, not when: we'd rather be honest than
          promise a date.
        </p>
      </div>
    </div>
    <div class="camps">
      {#each camps as camp, i (camp.id)}<CampCard {camp} n={i + 1} />{/each}
    </div>
  </section>

  <River />
  <Campfire />
  <Beasts />
  <TimeSplit />
  <Journal />
  <Voices />
  <Trophies />
</main>

<footer class="wrap">
  <p>
    Pulled from GitHub (<a href={summit.url}>the {summit.name} milestone</a>, FW Lite, Lexbox and Harmony) and the SIL
    community forum on {fmtDate(generatedAt.toISOString())}. Plain-language titles are written by an AI from the GitHub titles,
    and the original title is always shown beside them.
  </p>
</footer>

<style>
  .camps {
    columns: 3 330px;
    column-gap: 22px;
  }
  .camps :global(.camp) {
    break-inside: avoid;
    margin: 0 0 26px;
  }
  footer {
    padding: 64px 16px 48px;
    color: var(--ink-soft);
    font-size: 0.9rem;
    max-width: 760px;
    text-align: center;
  }
</style>
