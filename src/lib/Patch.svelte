<script lang="ts">
  let {
    earned,
    icon,
    big,
    ring,
    color,
    note,
    href,
  }: { earned: boolean; icon: string; big: string; ring: string; color: string; note: string; href?: string } = $props()

  const id = `ring-${Math.random().toString(36).slice(2)}`
</script>

<svelte:element this={href ? 'a' : 'div'} {href} class="patch" class:locked={!earned} style="--patch: {color}">
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <path id={id} d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0" />
    </defs>
    <circle cx="100" cy="100" r="96" fill="var(--patch)" />
    <circle cx="100" cy="100" r="88" fill="none" stroke="var(--paper)" stroke-width="2.5" stroke-dasharray="5 5" />
    <circle cx="100" cy="100" r="62" fill="var(--card)" />
    <text class="ring"><textPath href="#{id}" startOffset="25%" text-anchor="middle">{ring.toUpperCase()}</textPath></text>
    <text x="100" y="98" text-anchor="middle" class="icon">{icon}</text>
    <text x="100" y="138" text-anchor="middle" class="big">{big}</text>
  </svg>
  <span class="sr-only">{ring}: {big}.</span>
  <span class="note">{note}</span>
</svelte:element>

<style>
  .patch {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    text-decoration: none;
    gap: 6px;
  }
  svg {
    width: 100%;
    max-width: 170px;
    filter: drop-shadow(0 4px 0 color-mix(in srgb, var(--ink) 25%, transparent));
    transition: transform 0.2s;
  }
  a.patch:hover svg {
    transform: rotate(-6deg) scale(1.04);
  }
  .locked svg {
    opacity: 0.38;
    filter: grayscale(0.6);
  }
  .ring {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 12.5px;
    letter-spacing: 0.08em;
    fill: var(--paper);
  }
  .icon {
    font-size: 40px;
    font-family: 'Noto Color Emoji', sans-serif;
  }
  .big {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 28px;
    fill: var(--ink);
  }
  .note {
    font-size: 0.85rem;
    color: var(--ink-soft);
    max-width: 22ch;
    line-height: 1.3;
  }
</style>
