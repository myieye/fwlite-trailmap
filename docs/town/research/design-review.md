# Review: FW Lite "place" map

Independent judgment on the three research reports, the existing trail map and the product repo. Verified: Threlte core 8.7.0 published 2026-11-02 (peer svelte>=5, three>=0.172), extras 9.23.1, three 0.187.0; KayKit City Builder Bits and Kenney kits are CC0; `src/data/snapshot.json` has exactly one commit, so there is no history to play back yet.

## 1. Theme: a small town diorama, not "metro grammar + campus skin"

The metro recommendation is a hedge. Metro maps encode routes between stops; FW Lite is not a sequence of stops, and a schematic skin throws away the one thing Tim asked for, a place you can look at. What is worth taking from metro maps is discipline, not form: a small fixed glyph vocabulary, schematic not geographic placement, a legend, a layout that never moves. Apply that discipline to a town.

Town over campus: a campus is one institution and has no natural reading for "shop not yet open", residents (users), utilities, or a bridge to an older town. A town has all of them, and Keyman gets its own town later with the same grammar. The "city implies residents" worry in report 01 is a feature: residents are the user-count overlay Tim already wants. Avoid the cute village look (reads patronizing for minority-language work) and anything culturally loaded: no flags, places of worship, or national architecture; plain low-poly forms.

Architecture or capabilities: both, but not underground. Underground is unreadable on a phone. Ground level is what a user does; infrastructure sits visibly on the riverside, because 10 to 12 of the ~30 open fires are in sync and local storage and would otherwise smear across every capability. Keep the Harmony river: it is the best metaphor the current site has.

Districts and key buildings (about 24 nodes, right for a phone):

| District | Buildings |
| --- | --- |
| Dictionary quarter | Entry editor (largest building), Entry list and search, Complex forms, History, Custom fields and views (empty lot) |
| Language quarter | Writing systems and collation, Lists (parts of speech, semantic domains), Keyman keyboards (empty lot), Project dashboard |
| Together quarter | Comments, Tasks and review, Pictures and audio |
| Arrivals (the town edge: how people get in) | Windows, Android, Linux, Mac (built, not open), iOS (scaffold, fenced), Paratext gate (scaffold) |
| Riverside works | Harmony river and waterworks (sync engine), Local store (reservoir: LcmCrdt/SQLite), Lexbox plant upriver with a sign-in gatehouse (server, auth), FwHeadless bridge to the old town across the river (FLEx, drawn in an older style) |

Leave CI, docs, l10n and installers off the map in v1; they dilute it. Web is not a node (the FAQ and architecture doc say there is no hosted web version).

Strongest rejected alternative: campus. It has the lowest gimmick risk, but it fails exactly the readings Tim listed (store opening, residents, utilities) and loses the river.

## 2. State vocabulary: four exclusive states, two overlays, badges carry the truth

Tim's six collapse badly: "improving" and "under construction" are confusable, and "broken" is not a state of a building but something happening to it. So:

| State (exclusive) | Drawn as | Data |
| --- | --- | --- |
| Planned | Signposted empty lot, dashed outline | In config, zero closed issues, not declared otherwise |
| Under construction | Scaffold, crane, fence | Has closed issues or merged PRs, not declared preview/open |
| Built, not open | Finished building, shutters down, "opening soon" banner, lock | Declared `status: preview` with `since` and evidence URL (Mac is the case today) |
| Open | Lit windows, open door | Declared `status: open` with `since` and release URL |

| Overlay (stackable) | Drawn as | Data |
| --- | --- | --- |
| Broken | Smashed window glyph, count badge | Any open `bug` attached to the node |
| Fire | Flames and smoke, count badge | Open `Data bug` or `High Priority` attached |
| Working on it | Hard hats and a small crane; on an Open building this reads as "improving" | Open PRs or assignees on attached issues |

Fog means "nobody has looked here yet", never "planned". Use it only for a district declared `status: unknown`, or not at all in v1. Tim's "iOS: scaffolding, locked" becomes Under construction plus fence, which is the honest reading; locked is reserved for finished work.

Honesty rules: only `open` and `preview` are human-declared, and each carries a date and a link. Everything else is counted from issues. Never draw partial completion of a building (a "70% built" tower turns into 50% the day someone files three issues); construction is binary and the badge shows "4 open, 9 done". No dates anywhere except `since`.

Phone legibility: every state has a 3D expression and a 2D HTML badge; the badge is the contract, the 3D is the mood. Test the legend on five outsiders including non-Western SIL staff: "point to what is broken, what is coming."

## 3. Rendering: Threlte + three, one kit, strict art direction

Agree with report 02 on Threlte 8 + three. It is Svelte 5 native and actively maintained. The asset-store look is a real risk and the report under-addresses it. The look comes from lighting, palette and composition, not the models:

- One kit only (Kenney City Kits or KayKit City Builder Bits, both CC0). Both use a single palette texture; replacing that texture recolors the whole town to the trail map's palette in one step, which is most of "cohesive".
- Orthographic camera at a fixed dimetric angle, flat or `MeshToonMaterial` shading, baked or blob shadows (no real-time shadow maps on phones), soft sky gradient matching the current site, the town on a rounded island base with the river cut through it. The island frames the scene and makes "zoom to fit" trivial on portrait.
- States in code, not in assets: ghost material for planned, instanced boxes for scaffold, a sprite-sheet particle for fire, banners and locks as HTML badges.
- Labels: Threlte `<HTML>` overlays for district names and badges, capped to about 30 on screen, no occlusion testing (the expensive part). Troika text is unnecessary.
- Budget: ~25 buildings, merged geometry, under 50 draw calls, DPR capped at 2, `frameloop: 'demand'` so the GPU idles when nothing moves, fire particles paused off-screen. Measure on a mid Android phone in the first week.

Strongest rejected alternative: pre-rendered isometric sprites in PixiJS. Best battery and an illustrated look, but every state × building × day/night is a baked image, and the camera is frozen. Keep it as the fallback if phone performance fails, since the sprites could be rendered from the same GLBs.

## 4. Interaction: fixed angle, pan and pinch, bottom sheet

- No orbit. Free rotation destroys label placement and people get lost. Fixed dimetric camera; pan and pinch zoom, bounded to the island.
- Two zoom bands: far shows district labels and building silhouettes in state colors; near shows building labels and badges. Tapping a district at far zoom zooms into it.
- Tap a building: portrait phone gets a bottom sheet with three snap points (peek: name, state, since; half: issues in plain words with fire and bug counts; full: everything). Desktop gets a right panel. Hit boxes are at least 44px at minimum zoom.
- Legend: a chip row under the title, collapsible; the same glyphs as on the map.
- Deep links: `#node=ios`, `#district=arrivals`; a "Tour" button that steps the camera through districts for management meetings.
- Accessibility: a list view toggle rendering the same data as text (the trail map's camp list is a good start), `prefers-reduced-motion` respected, canvas labelled with a summary.
- Portrait: layout stays fixed; the island is roughly square so zoom-to-fit works both ways; top bar is title, legend, list toggle only.

## 5. Data model, attachment, layout, history

Config (one YAML, as now):

```yaml
districts:
  - id: arrivals
    name: Arrivals
    nodes:
      - id: mac
        name: Mac
        status: preview            # only open|preview are declared
        since: 2025-09
        evidence: https://github.com/sillsdev/languageforge-lexbox/releases/...
        match: { titles: [/\bmac(os)?\b|catalyst|dmg/i], paths: [backend/FwLite/FwLiteMaui/Platforms/MacCatalyst/**] }
        issues: [lexbox#2647]      # pins beat rules
edges: [[entry-editor, harmony], [harmony, lexbox], [lexbox, fwheadless]]
```

Attachment order: explicit pins, then sub-issues of a pinned epic, then PR file paths (a PR's linked issue inherits), then title regex. One issue can attach to several nodes (#2693 is media and iOS). Unmatched milestone issues land on a "Still to sort" lot, keeping the current "nothing silently drops" rule. Report 03's estimate (about 40% clean) means the first config is a day of hand pinning; budget it.

Layout: a committed `layout.json` written by a build-time placer: districts on a fixed grid with headroom, new buildings take the next free lot, nothing moves. No graph layout library; edges are few and mostly "sits on the river". Relayout is an explicit command that bumps an epoch, so playback can cross-fade between epochs instead of jumping.

History to record now, or playback is impossible later: a dated snapshot per sync under `history/` (one per day, skipped when unchanged, ~100KB), config status changes kept in a `changelog:` list rather than overwritten, and `layout.json` under git. Issue open/close times alone are not enough: labels, milestones, assignees and node membership have no history on GitHub.

## 6. Phasing

Prototype 1 (about a week): the Dictionary quarter, Arrivals and the river, with hand-placed layout JSON and the current snapshot. All four states and two overlays, HTML badges, pan/pinch, bottom sheet, list view. Fake the issue attachment with pins only. Deploy next to the trail map, not instead of it. Test on a mid Android phone and an iPhone.

Riskiest assumptions, in order: outsiders can read the states at phone size (legend test); phone performance and battery; management reads a low-poly town as serious rather than a toy (show it to two of them early); the issue-to-node mapping stays honest as the backlog grows.

Prototype 2: full map, rule-based attachment, daily history snapshots, deep links and tour. Metrics overlays and playback only after a month of recorded history exists.

## 7. Open questions for Tim

1. Town or campus? Default: town.
2. Does the new map replace the trail map or sit beside it? Default: beside it; the trail map answers "how far to 1.0" (time), the town answers "what state is everything in" (space), and its list is the accessibility fallback.
3. Which infrastructure appears? Default: Harmony, local store, Lexbox with sign-in, FwHeadless bridge, FLEx old town. Not hgweb, CI, docs or l10n.
4. Fire definition: `Data bug` or `High Priority` burns, plain `bug` is a broken window. Default: yes.
5. iOS: under construction with a fence, not planned and not locked. Default: yes.
6. Start committing daily snapshots now, before any town exists? Default: yes, it costs nothing and buys playback.

Sources checked: [npm @threlte/core](https://www.npmjs.com/package/@threlte/core), [Threlte migration guides](https://threlte-git-studio-threlte.vercel.app/docs/learn/advanced/migration-guides), [KayKit City Builder Bits (CC0)](https://kaylousberg.itch.io/city-builder-bits), [Three.js text options discussion](https://discourse.threejs.org/t/what-is-the-best-way-to-display-text/28788), [Threlte CSS2DRenderer example](https://threlte-git-studio-threlte.vercel.app/docs/examples/renderers/css2drenderer-overlay), [three.js forum on flat-shaded toon scenes](https://discourse.threejs.org/t/how-to-create-a-scene-like-this/51835/2).
