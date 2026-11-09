<script lang="ts">
  import type { Camp } from './model'
  import { measurePath } from './path'

  let { camps, start }: { camps: Camp[]; start: string } = $props()

  const riverD = 'M-10 612 C 160 650 320 590 470 618 S 760 650 900 610 S 1110 600 1210 628'
  const trailD =
    'M 70 598 C 230 606 330 560 268 506 S 250 420 420 428 S 640 452 650 380 S 560 292 700 270 S 860 262 852 206 S 900 128 984 104'
  const trail = measurePath(trailD)
  const length = trail.length

  // Each river dash is its own one-unit <svg>, moved by a transform in percent of that unit.
  const PERIOD = 40
  const SPEED = 80 / 3
  const river = measurePath(riverD)
  const dashes = Math.ceil(river.length / PERIOD) + 2
  // Starts a dash before the river and ends past it, both off the map, so dashes never pop in or out where you can see them.
  const frames = Array.from({ length: dashes * 2 + 1 }, (_, k) => {
    const { x, y, deg } = river.point(-PERIOD + (k * PERIOD) / 2)
    return { transform: `translate(${x * 100}%, ${y * 100}%) rotate(${deg}deg)` }
  })
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const flowing = (i: number) => (el: SVGElement) => {
    const duration = ((dashes * PERIOD) / SPEED) * 1000
    const anim = el.animate(frames, { duration, delay: (-i * PERIOD * 1000) / SPEED, iterations: Infinity })
    if (still) anim.pause()
    return () => anim.cancel()
  }

  // Running animations, even composited ones, cost style work on every scrolled frame, so they rest while the map is out of view.
  const restOffscreen = (art: HTMLElement) => {
    const io = new IntersectionObserver(([e]) => {
      for (const a of art.getAnimations({ subtree: true }))
        if (a.playState !== 'finished') e.isIntersecting && !still ? a.play() : a.pause()
    })
    io.observe(art)
    return () => io.disconnect()
  }

  // Camps are evenly spaced so labels never pile up; the counts carry the amount of work.
  const stops = $derived(camps.map((_, i) => (i + 0.75) / (camps.length + 0.4)))
  const at = (f: number) => trail.point(f * length * 0.985)
  // Each leg of the trail leads to one camp; we've walked as much of a leg as that camp is done.
  const walked = $derived(camps.reduce((f, c, i) => f + (stops[i] - (stops[i - 1] ?? 0)) * c.pct, 0))
  // The hiker stands mid-leg, between the camps it's walking between, so it never covers a camp label.
  const leg = $derived(stops.findIndex((s) => s > walked))
  const hikerAt = $derived(leg < 0 ? 1 : ((stops[leg - 1] ?? 0) + stops[leg]) / 2)
  const hiker = $derived(at(hikerAt))

  const done = $derived(camps.reduce((n, c) => n + c.done, 0))
  const total = $derived(camps.reduce((n, c) => n + c.total, 0))

  // Places an overlay at map coordinates.
  const box = (x: number, y: number, w: number, h: number) =>
    `left: ${x / 12}%; top: ${y / 7}%; width: ${w / 12}%; height: ${h / 7}%`

  const status = (c: Camp) => (c.pct === 1 ? 'reached' : c.done > 0 ? 'climbing' : 'ahead')

  const pines: [number, number, number][] = [
    [40, 520, 1], [74, 540, 0.8], [130, 470, 1.2], [160, 500, 0.9], [340, 600, 1], [372, 586, 0.7],
    [520, 520, 1.1], [552, 540, 0.8], [800, 360, 1], [828, 380, 0.75], [1100, 470, 1.2], [1140, 490, 0.9],
    [1060, 520, 0.8], [470, 330, 0.7], [900, 420, 0.9], [210, 380, 0.7],
  ]
  const stars = Array.from({ length: 60 }, (_, i) => [(i * 263 + ((i * i * 71) % 97)) % 1190, (i * i * 37 + i * 11) % 250, (i % 3) * 0.5 + 0.6])
</script>

<figure class="map card">
  <div class="art" {@attach restOffscreen}>
    <svg viewBox="0 0 1200 700" role="img" aria-labelledby="map-title">
      <title id="map-title">
        Trail map to 1.0. Camps: {camps
          .map((c) => `${c.name} ${c.done} of ${c.total}`)
          .join(', ')}
      </title>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--sky-top)" />
          <stop offset="1" stop-color="var(--sky-bottom)" />
        </linearGradient>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--ink)" stroke-opacity=".08" stroke-width="3" />
        </pattern>
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
      </defs>

      <rect width="1200" height="700" fill="url(#sky)" />
      <g class="stars">
        {#each stars as [x, y, r]}<circle cx={x} cy={y} {r} fill="var(--snow)" />{/each}
      </g>
      <g class="orb">
        <circle cx="1030" cy="150" r="120" fill="var(--orb)" style="opacity: calc(var(--halo) * 0.6)" />
        <circle cx="1030" cy="150" r="88" fill="var(--orb)" style="opacity: var(--halo)" />
        <circle cx="1030" cy="150" r="58" fill="var(--orb)" />
      </g>

      <path
        d="M0 330 L120 250 L210 300 L330 190 L430 270 L520 220 L640 300 L760 180 L860 240 L1200 210 L1200 700 L0 700Z"
        fill="var(--mtn-far)"
        filter="url(#rough)"
      />
      <path d="M700 420 L984 92 L1200 330 L1200 700 L700 700Z" fill="var(--mtn-mid)" filter="url(#rough)" />
      <path d="M984 92 L1040 160 L1012 150 L995 172 L972 146 L948 160Z" fill="var(--snow)" />
      <path d="M984 92 L1200 330 L1200 700 L984 700Z" fill="url(#hatch)" />
      <path
        d="M0 440 L90 380 L180 420 L300 330 L420 400 L540 350 L650 420 L760 380 L860 450 L1200 430 L1200 700 L0 700Z"
        fill="var(--mtn-near)"
        opacity=".85"
        filter="url(#rough)"
      />
      <path d="M0 500 C 200 440 380 470 560 480 S 900 430 1200 470 L1200 700 L0 700Z" fill="var(--hill)" />
      <path d="M0 560 C 240 520 420 580 700 560 S 1000 520 1200 560 L1200 700 L0 700Z" fill="var(--hill-2)" />
      <g fill="none" stroke="var(--ink)" stroke-opacity=".09" stroke-width="1.5">
        <path d="M0 520 C 200 470 380 500 560 505 S 900 460 1200 495" />
        <path d="M0 540 C 200 492 380 522 560 528 S 900 482 1200 518" />
        <path d="M0 590 C 240 552 420 606 700 588 S 1000 552 1200 590" />
      </g>

      <a href="#harmony" class="river-link">
        <title>Harmony, the sync engine underneath it all</title>
        <path d={riverD} fill="none" stroke="var(--c-river)" stroke-width="26" stroke-linecap="round" />
      </a>
    </svg>
    <div class="flow" aria-hidden="true">
      {#each { length: dashes } as _, i}<svg viewBox="0 0 1 1" {@attach flowing(i)}><path d="M0 0h14" /></svg>{/each}
    </div>
    <svg class="layer" viewBox="0 0 1200 700" aria-hidden="true">
      <path id="river" d={riverD} fill="none" />
      <!-- Out of the tab order: keyboards reach the river link itself. -->
      <a href="#harmony" tabindex="-1" class="river-name">
        <text class="hand river-label"><textPath href="#river" startOffset="58%">Harmony River · carries every edit home</textPath></text>
      </a>

      {#each pines as [x, y, s]}
        <g transform="translate({x} {y}) scale({s})">
          <rect x="-2" y="0" width="4" height="10" fill="var(--ink)" opacity=".5" />
          <path d="M0 -38 L14 -12 L7 -12 L17 4 L-17 4 L-7 -12 L-14 -12Z" fill="var(--c-forest)" />
        </g>
      {/each}

      <path d={trailD} fill="none" stroke="var(--ink)" stroke-opacity=".18" stroke-width="13" stroke-linecap="round" />
      <path d={trailD} fill="none" stroke="var(--trail)" stroke-width="4" stroke-dasharray="2 11" stroke-linecap="round" />
    </svg>
    <svg class="layer walked" viewBox="0 0 1200 700" aria-hidden="true">
      <path
        d={trailD}
        fill="none"
        stroke="var(--c-rust)"
        stroke-width="6"
        stroke-linecap="round"
        stroke-dasharray="{hikerAt * length * 0.985} {length}"
        style="--walked: {hikerAt * length * 0.985}"
      />
    </svg>
    <svg class="layer top" viewBox="0 0 1200 700">
      <g transform="translate(70 598)">
        <rect x="-50" y="-72" width="150" height="38" rx="10" fill="var(--card)" stroke="var(--ink)" stroke-opacity=".25" />
        <text x="25" y="-47" text-anchor="middle" class="small">🏁 {start}</text>
        <circle r="8" fill="var(--c-rust)" stroke="var(--ink)" stroke-width="2.5" />
      </g>

      <g transform="translate(984 104)">
        <line x1="0" y1="0" x2="0" y2="-62" stroke="var(--ink)" stroke-width="3" />
        <text x="58" y="-34" class="summit-label">1.0</text>
      </g>

      {#each camps as camp, i}
        {@const p = at(stops[i])}
        {@const left = i % 2 === 1}
        <a href="#camp-{camp.id}" class="camp {status(camp)}">
          <g transform="translate({p.x} {p.y})">
            <circle r="23" fill="var(--card)" stroke="var(--ink)" stroke-width="2.5" />
            <circle
              r="23"
              fill="none"
              stroke="var(--c-sage)"
              stroke-width="6"
              stroke-dasharray="{camp.pct * 144.5} 145"
              transform="rotate(-90)"
            />
            <text y="9" text-anchor="middle" class="camp-icon">{camp.icon}</text>
            <g class="label" transform="translate({left ? -34 : 34} -8)">
              <text text-anchor={left ? 'end' : 'start'} class="camp-name">{i + 1}. {camp.name}</text>
              <text y="24" text-anchor={left ? 'end' : 'start'} class="hand camp-count">
                {camp.pct === 1 ? 'reached! 🎉' : `${camp.done} of ${camp.total} done`}
              </text>
            </g>
          </g>
        </a>
      {/each}
    </svg>
    <svg class="flag" viewBox="0 -62 46 26" style={box(984, 42, 46, 26)} aria-hidden="true">
      <path d="M0 -62 L46 -50 L0 -36Z" fill="var(--c-rust)" />
    </svg>
    <div class="hiker" style={box(hiker.x - 30, hiker.y - 30, 230, 60)} aria-hidden="true">
      <svg viewBox="-30 -30 230 60">
        <circle r="27" fill="var(--c-sun)" stroke="var(--ink)" stroke-width="3" />
        <!-- Fixed dark ink: the sun disc stays light in both themes. -->
        <g fill="none" stroke="#1d2a3f" stroke-linecap="round" stroke-linejoin="round">
          <rect x="-9.5" y="-9" width="7" height="11" rx="2.5" fill="#1d2a3f" stroke="none" />
          <circle cx="2" cy="-14" r="4.5" fill="#1d2a3f" stroke="none" />
          <path d="M1 -8 L-1 4" stroke-width="5" />
          <path d="M-1 4 L5 15 M-1 4 L-6 15" stroke-width="4" />
          <path d="M1 -5 L8 0" stroke-width="3.5" />
          <path d="M10 -7 L7 17" stroke-width="2.5" />
        </g>
        <path d="M36 0 L48 -9 L48 9Z" fill="var(--ink)" />
        <rect x="46" y="-15" width="150" height="30" rx="15" fill="var(--ink)" />
      </svg>
      <!-- HTML, not SVG text: Chrome re-lays out SVG text on every frame an ancestor moves. -->
      <span class="you-are-here">{done} of {total} done</span>
    </div>
  </div>
  <figcaption>
    All {camps.length} camps are being worked on at once; each ring shows how far along it is. Camps say what we'll do, not
    when: we'd rather be honest than promise a date.
  </figcaption>
</figure>

<style>
  .map {
    margin: 0;
    overflow: hidden;
    padding: 0;
    border-radius: 22px;
  }
  .art {
    position: relative;
    container-type: inline-size;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    font-family: var(--font-body);
  }
  /*
   * Everything that moves is its own HTML-level element over the static map: Chrome repaints the whole page on every
   * scrolled frame while something inside an <svg> animates, even by transform, but not while an <svg> itself does.
   * The trail's one-off stroke-dashoffset animation has to paint, so its own layer keeps that off the filtered mountains.
   */
  .layer,
  .flow {
    position: absolute;
    inset: 0;
    height: 100%;
    pointer-events: none;
  }
  .walked {
    will-change: transform;
  }
  .flow {
    overflow: hidden;
  }
  .flow svg {
    position: absolute;
    width: calc(100% / 1200);
    height: calc(100% / 700);
    overflow: visible;
    transform-origin: 0 0;
    stroke: var(--snow);
    stroke-opacity: 0.55;
    stroke-width: 2.5;
  }
  .flag,
  .hiker {
    position: absolute;
    overflow: visible;
    pointer-events: none;
  }
  .layer a {
    pointer-events: auto;
  }
  .stars {
    opacity: var(--stars, 0);
  }
  .small {
    font-size: 15px;
    font-weight: 700;
    fill: var(--ink);
  }
  .hand {
    font-family: var(--font-hand);
  }
  .river-link,
  .river-name {
    cursor: pointer;
  }
  .river-link:hover path,
  .river-link:focus-visible path,
  .art:has(.river-name:hover) .river-link path {
    stroke-width: 32px;
  }
  .river-label {
    font-size: 22px;
    font-weight: 700;
    fill: var(--snow);
    letter-spacing: 0.02em;
  }
  .summit-label {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 900;
    fill: var(--ink);
  }
  .camp-icon {
    font-size: 24px;
    font-family: var(--font-emoji);
  }
  .camp-name {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 21px;
    fill: var(--ink);
    paint-order: stroke;
    stroke: var(--card);
    stroke-width: 6px;
    stroke-linejoin: round;
  }
  .camp-count {
    font-size: 22px;
    fill: var(--ink);
    paint-order: stroke;
    stroke: var(--card);
    stroke-width: 5px;
  }
  .camp {
    cursor: pointer;
  }
  .camp:hover circle:first-child,
  .camp:focus-visible circle:first-child {
    fill: var(--c-sun);
  }
  .camp.ahead .camp-icon {
    opacity: 0.55;
  }
  .hiker {
    animation: bob 2.4s ease-in-out infinite;
  }
  figcaption {
    padding: 10px 16px 14px;
    text-align: center;
    font-size: 0.9rem;
    color: var(--ink-soft);
  }
  .you-are-here {
    position: absolute;
    left: calc(76 / 230 * 100%);
    width: calc(150 / 230 * 100%);
    top: 25%;
    height: 50%;
    display: grid;
    place-items: center;
    font-size: calc(16 / 1200 * 100cqw);
    font-weight: 700;
    line-height: 1;
    color: var(--paper);
  }
  .flag {
    transform-origin: 0 calc(12 / 26 * 100%);
    animation: wave 2.8s ease-in-out infinite;
  }
  .walked path {
    animation: walk 2.2s cubic-bezier(0.6, 0, 0.2, 1) both;
  }
  /* Shift by the dash's own length: shifting further makes it start past the hiker and wrap round from the base. */
  @keyframes walk {
    from {
      stroke-dashoffset: var(--walked);
    }
  }
  /* 6 map units of its 60. */
  @keyframes bob {
    50% {
      transform: translateY(-10%);
    }
  }
  @keyframes wave {
    50% {
      transform: skewY(6deg) scaleX(0.92);
    }
  }
  @media (max-width: 720px) {
    .label,
    .river-label {
      display: none;
    }
  }
</style>
