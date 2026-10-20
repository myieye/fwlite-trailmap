# Trailmap: agent notes

A static Svelte 5 + Vite page. `npm run sync` pulls GitHub and forum data into `src/data/snapshot.json`; the page reads it plus `trailmap.config.yaml` and `content/plain-words.json` at build time. No backend.

## Refreshing plain words

1. `npm run sync`, then `npm run plain:todo` lists every item the page shows that has no plain title, or whose GitHub title changed since (`stale`).
2. For each, add or update `content/plain-words.json`: `{"lexbox#123": {"title": "...", "for": "<exact GitHub title>", "area": "..."}}`. Read the issue on GitHub if the title alone is unclear.
3. Re-run `npm run plain:todo` until it reports 0.

The rules for `title` and `area` are in `scripts/plain-words/prompt.md`, which is also the system prompt Claude gets in CI.

`.github/workflows/publish.yaml` does this every 6 hours and commits the titles straight to main, unreviewed. It is locked down on purpose: the model gets no tools, only GitHub titles, labels and trimmed descriptions, and `scripts/plain-words/apply.mjs` re-checks everything it returns. Keep it that way: no tools, no write access, and no npm packages in the job that holds the token.

## Changing the roadmap

Edit `trailmap.config.yaml`. Camps, Harmony goals, beasts and forum links are all there with comments. Run `npm run sync` after adding issue refs the snapshot doesn't have yet; the build fails loudly on a ref it can't find. Forum links must be checked by hand: a wrong "on the road to 1.0" misleads the people who voted.

## Checking your work

`npm run check` (svelte-check) and `npm run build`. For visuals, `npm run dev` and `npm run shot -- http://localhost:5173/ /tmp/shot 1280` writes light and dark full-page screenshots (Chromium at `/opt/pw-browsers/chromium`; change `executablePath` in `scripts/shot.mjs` elsewhere).
