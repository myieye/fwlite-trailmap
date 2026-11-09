# Tech research (Sonnet subagent; versions from npm 2026-11-09; bundle sizes unverified)

Versions: three 0.187.0, @threlte/core 8.7.0 (peer svelte>=5), @threlte/extras 9.23.1, @threlte/gltf 3.1.0, pixi.js 8.22.0, @babylonjs/core 9.35.0, playcanvas 2.23.3, phaser 4.2.1, elkjs 0.12.1, @gltf-transform/cli 4.5.1.

Rendering:
- Threlte 8 + three (TOP): Svelte 5 native; <T.Mesh>, useGltf, <HTML> overlays, interactivity(). ~150-200KB gz. Ghost/wireframe materials, instanced crowds, particles, glTF swaps for scaffold/crane.
- PixiJS 8 + pre-rendered isometric sprites (SECOND): best mobile/battery, illustrated 2D look, but every state baked per building; sprites can be rendered offline from the same GLBs.
- R3F: needs React island, not worth it. Babylon 600KB+, overkill. PlayCanvas/Phaser: skip. Godot/Unity web: 15-40MB wasm, no DOM labels, no. Spline: data-driven state hard, no.
- Plain SVG: crispest, accessible, but art is the bottleneck; keep current trail map/list as accessible fallback.
- Labels as HTML overlays (crisp, selectable, screen-reader). Mobile: orthographic camera, instancing, DPR<=2, baked/no shadows, texture atlas; ~60 buildings + 5k particles OK on mid phones (unverified).

Assets:
- Kenney (CC0): City Kit Roads/Commercial/Industrial/Suburban, Building Kit, Space Kit, Mini Characters, Mini Forest. Consistent flat low-poly. GLB. Construction fences/barriers in Roads kit; no scaffold/fire.
- KayKit City Builder Bits (CC0 free tier 32+ models). Gradient atlas low-poly. Prototype Bits = grey "planned" look. Space Base Bits license unverified.
- Quaternius (mostly CC0, check per pack): Downtown City MegaKit, Modular Streets, sci-fi, nature, Background Posed Humans (crowds).
- Poly Pizza / OpenGameArt: mixed licenses/styles; source for one-off crane/scaffold/fire, recolor to palette.
- Synty: paid EULA unclear for web distribution; avoid.
- Plan: one base kit + state effects in code (procedural scaffold, particle fire/smoke, ghost material, crane from boxes, broken-window decal).

Layout:
- Deterministic tile grid: districts placed by fixed order via shelf-pack/treemap with growth headroom; buildings appended to next free cell, never moved; roads along grid lines / A*. Build-time script writes committed layout.json so playback never jumps. elkjs (1.4MB) build-time only if edges matter. d3-force unstable; dagre unmaintained.

Prior art (from memory): CodeCity, CodeCharta (legend + details panel keep it usable), Gource (timeline playback model), GitHub Skyline. Few discrete states beat many tiny effects.

Risks: art consistency (mixed packs), state legibility at phone size (pair 3D effects with HTML badges), layout stability, mobile GPU/memory, licensing (CREDITS file), accessibility (WebGL opaque; keep list view).
