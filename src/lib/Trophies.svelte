<script lang="ts">
  import Patch from './Patch.svelte'
  import { ageDays, fmtDate, isBehindScenes, beasts, camps, closedIssues, plainTitle, releases, river, shipped, voices } from './model'

  const reached = camps.filter((c) => c.pct === 1)
  const nextCamp = [...camps].filter((c) => c.pct < 1).sort((a, b) => b.pct - a.pct)[0]
  const slain = beasts.filter((b) => b.slain)
  const closest = [...beasts].filter((b) => !b.slain).sort((a, b) => a.left - b.left)[0]
  const oldest = [...closedIssues].filter((i) => !isBehindScenes(i)).sort((a, b) => ageDays(b) - ageDays(a))[0]
  const appReleases = releases.filter((r) => r.repo === 'lexbox')
  const granted = voices.filter((v) => v.status === 'shipped')
  const harmonyDone = river.reduce((n, g) => n + g.done, 0)
  const userFacing = shipped.filter((i) => i.repo === 'lexbox').length
</script>

<section class="wrap section" id="trophies">
  <div class="section-head">
    <div>
      <span class="eyebrow">Trophy case</span>
      <h2>Patches the team has earned</h2>
      <p>Team achievements only. Faded patches are the next ones within reach.</p>
    </div>
  </div>
  <div class="grid">
    <Patch
      earned={appReleases.length > 0}
      icon="🚀"
      big={String(appReleases.length)}
      ring="Releases in 10 weeks"
      color="var(--c-rust)"
      note={appReleases[0] ? `Latest: ${fmtDate(appReleases[0].date)}` : 'No release in 10 weeks yet'}
    />
    <Patch
      earned={Boolean(oldest)}
      icon="🦴"
      big={oldest ? `${ageDays(oldest)}d` : '–'}
      ring="Oldest issue closed"
      color="var(--c-plum)"
      note={oldest ? plainTitle(oldest) : ''}
      href={oldest?.url}
    />
    <Patch
      earned={granted.length > 0}
      icon="💌"
      big={String(granted.length)}
      ring="Forum wishes granted"
      color="var(--c-river)"
      note="Forum requests that are now in the app"
      href="#voices"
    />
    <Patch
      earned={userFacing > 0}
      icon="🧭"
      big={String(shipped.length)}
      ring="Changes in 10 weeks"
      color="var(--c-sun)"
      note="{userFacing} in FW Lite & Lexbox, {shipped.length - userFacing} in Harmony"
      href="#time"
    />
    <Patch
      earned={harmonyDone > 0}
      icon="🌊"
      big={String(harmonyDone)}
      ring="Harmony steps done"
      color="var(--c-forest)"
      note="Toward the four sync engine goals"
      href="#harmony"
    />
    {#each reached as camp (camp.id)}
      <Patch earned icon={camp.icon} big="✓" ring="Camp reached" color="var(--c-sage)" note={camp.name} href="#camp-{camp.id}" />
    {/each}
    {#if nextCamp}
      <Patch
        earned={false}
        icon={nextCamp.icon}
        big="{nextCamp.total - nextCamp.done} left"
        ring="Next camp"
        color="var(--c-sage)"
        note="{nextCamp.name}: {nextCamp.done} of {nextCamp.total} done"
        href="#camp-{nextCamp.id}"
      />
    {/if}
    {#each slain as beast (beast.item.key)}
      <Patch earned icon={beast.creature} big="✓" ring="Beast defeated" color="var(--c-rust)" note="{beast.name}, after {beast.days} days" href={beast.item.url} />
    {/each}
    {#if closest}
      <Patch
        earned={false}
        icon={closest.creature}
        big="{closest.left} to go"
        ring="Closest hunt"
        color="var(--c-rust)"
        note="{closest.name}: {closest.left} steps left"
        href="#beasts"
      />
    {/if}
  </div>
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 26px 18px;
  }
</style>
