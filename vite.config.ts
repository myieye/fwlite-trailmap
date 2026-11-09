import { svelte } from '@sveltejs/vite-plugin-svelte'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { parse } from 'yaml'

const yaml: Plugin = {
  name: 'yaml',
  transform(code, id) {
    if (id.endsWith('.yaml')) return { code: `export default ${JSON.stringify(parse(code))}`, map: null }
  },
}

// Leaves out synced data the page never reads, so phones download and parse less.
const omit = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)))
const trimData: Plugin = {
  name: 'trim-data',
  enforce: 'pre',
  transform(code, id) {
    if (id.endsWith('/src/data/snapshot.json')) {
      const s = JSON.parse(code)
      s.items = Object.fromEntries(
        Object.entries(s.items).map(([k, v]) => [k, omit(v as Record<string, unknown>, ['updatedAt', 'comments', 'reactions', 'milestone'])]),
      )
      s.forum = s.forum.map((t: Record<string, unknown>) => omit(t, ['views', 'lastActivityAt']))
      s.releases = s.releases.map((r: Record<string, unknown>) => omit(r, ['tag', 'name', 'prerelease']))
      return { code: JSON.stringify(s), map: null }
    }
    if (id.endsWith('/content/plain-words.json')) {
      const { items } = JSON.parse(readFileSync(new URL('./src/data/snapshot.json', import.meta.url), 'utf8'))
      const plain = Object.entries(JSON.parse(code) as Record<string, { title: string; area?: string }>)
        .filter(([k]) => items[k])
        .map(([k, { title, area }]) => [k, { title, area }])
      return { code: JSON.stringify(Object.fromEntries(plain)), map: null }
    }
  },
}

// Starts the hero's fonts downloading with the HTML instead of after the JS and CSS, so the first paint rarely swaps fonts.
const preloadFonts: Plugin = {
  name: 'preload-fonts',
  transformIndexHtml(_html, ctx) {
    const files = Object.keys(ctx.bundle ?? {}).filter((f) => /(fraunces-latin-full|figtree-latin-wght)-normal.*\.woff2$/.test(f))
    return files.map((f) => ({
      tag: 'link',
      attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `./${f}`, crossorigin: '' },
      injectTo: 'head',
    }))
  },
}

const root = fileURLToPath(new URL('.', import.meta.url))

// SINGLE_FILE=1 inlines everything into one index.html, for hosts that only take one file.
// TOWN_ONLY=1 builds the town prototype into dist/town/, a folder that can also be hosted on its own.
export default defineConfig({
  base: './',
  ...(process.env.TOWN_ONLY ? { root: `${root}town`, build: {
          outDir: `${root}dist/town`,
          emptyOutDir: true,
          chunkSizeWarningLimit: 900,
          // Claude artifacts won't serve .glb files, so INLINE_MODELS=1 bakes them into the JS as data: URLs.
          ...(process.env.INLINE_MODELS ? { assetsInlineLimit: (file: string) => file.endsWith('.glb') || undefined } : {}),
        } } : {}),
  plugins: [svelte(), yaml, trimData, preloadFonts, ...(process.env.SINGLE_FILE ? [viteSingleFile()] : [])],
  resolve: {
    alias: process.env.SINGLE_FILE
      ? [{ find: /^\.\/fonts$/, replacement: fileURLToPath(new URL('./src/fonts.single.css', import.meta.url)) }]
      : [],
  },
})
